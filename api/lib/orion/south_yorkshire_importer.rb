# frozen_string_literal: true

require "digest"
require "roo"

module Orion
  class SouthYorkshireImporter
    DATA_ROOT = ENV.fetch("ORION_IMPORT_ROOT", "/Users/michaelthomas/Desktop/Courts")
    CLUSTER = Domain::CLUSTER
    BENCH = Domain::BENCH
    SITTING_BATCH_SIZE = 500

    FILES = {
      summary: "SITTINGSUMMARY - South Yorkshire 01.04.2025-31.03.2026.xlsx",
      cancelled: "South Yorkshire CANCELLED_SITTINGS April 2025- March 2026.xlsx",
      vacancy: "South Yorkshire VACANCY_ASSIGNMENT_HISTORY April 2025 - March 2026.xlsx",
      vacated: "South Yorkshire VACATED_SITTINGS 2025-2026.xlsx",
      rota: "Removed Magistrates/South Yorkshire-Rota Jul 26.xlsx"
    }.freeze

    def initialize(root: DATA_ROOT, clear: true, progress: ImportProgressReporter.new)
      @root = Pathname(root)
      @clear = clear
      @progress = progress
      @magistrates_by_email = {}
      @courthouses_by_name = {}
      @sitting_types_by_name = {}
      @stats = Hash.new(0)
    end

    attr_reader :stats

    def import!
      validate_files!
      @progress.message("Starting South Yorkshire import from #{@root}")

      with_connection_transaction("clearing existing data") { clear_existing! } if @clear
      with_connection_transaction("seeding courthouses") { seed_canonical_courthouses! }
      import_magistrates_from_overview!
      enrich_from_rota!
      warm_lookup_caches!
      import_home_courthouses_from_location_breakdown!
      import_leaves_from_appraisal!
      warm_lookup_caches!
      import_completed_sittings!(:populated_by_ra)
      import_completed_sittings!(:accepted_by_magistrate)
      import_vacated_sittings!
      import_cancelled_sittings!

      @progress.message("Import finished")
      stats
    end

    private

    def validate_files!
      missing = FILES.filter_map { |key, rel| "#{key}: #{rel}" unless (@root + rel).exist? }
      raise "Missing import files under #{@root}:\n#{missing.join("\n")}" if missing.any?
    end

    def clear_existing!
      tables = %w[
        sittings
        leaves_of_absence
        notes
        cases
        magistrate_sitting_locations
        magistrates
        courthouses
        sitting_types
      ]
      ActiveRecord::Base.connection.execute(
        "TRUNCATE #{tables.join(', ')} RESTART IDENTITY CASCADE"
      )
      reset_import_caches!
    end

    def reset_import_caches!
      @magistrates_by_email = {}
      @courthouses_by_name = {}
      @sitting_types_by_name = {}
    end

    def path_for(key) = @root + FILES.fetch(key)

    def open_sheet(key, sheet_name)
      Roo::Spreadsheet.open(path_for(key).to_s).sheet(sheet_name)
    end

    def with_connection_transaction(label)
      @progress.phase(label, 1)
      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction { yield }
      end
      @progress.finish_phase
    end

    def with_batched_rows(label, rows)
      total = rows.size
      @progress.phase(label, total)
      return @progress.finish_phase if total.zero?

      rows.each_slice(SITTING_BATCH_SIZE) do |batch|
        ActiveRecord::Base.connection_pool.with_connection do
          ActiveRecord::Base.transaction do
            batch.each do |row|
              yield row
              @progress.tick
            end
          end
        end
      end
      @progress.finish_phase
    end

    def normalize_email(value)
      value.to_s.strip.downcase.presence
    end

    def normalize_name(value)
      value.to_s.strip.presence
    end

    def parse_date(value)
      return value.to_date if value.respond_to?(:to_date)
      return nil if value.blank?

      Date.strptime(value.to_s.strip, "%d-%m-%Y")
    rescue ArgumentError
      Date.parse(value.to_s)
    rescue ArgumentError
      nil
    end

    def parse_datetime(value)
      return value.in_time_zone if value.respond_to?(:in_time_zone)
      return nil if value.blank?

      Time.zone.parse(value.to_s)
    rescue ArgumentError
      nil
    end

    def courthouse_for!(name)
      canonical = Domain.normalize_location(name)
      return nil if canonical.blank?

      cached = @courthouses_by_name[canonical]
      if cached&.persisted? && Courthouse.exists?(cached.id)
        return cached
      end

      @courthouses_by_name[canonical] = Courthouse.find_or_create_by!(name: canonical) do |c|
        c.cluster = CLUSTER
        c.bench = BENCH
      end
    end

    def courthouse_for_existing!(name)
      canonical = Domain.normalize_location(name)
      return nil if canonical.blank?

      cached = @courthouses_by_name[canonical]
      if cached&.persisted? && Courthouse.exists?(cached.id)
        return cached
      end

      courthouse = Courthouse.find_by(name: canonical)
      @courthouses_by_name[canonical] = courthouse if courthouse
      courthouse
    end

    def warm_lookup_caches!
      @progress.phase("warming lookup caches", 1)
      @magistrates_by_email = Magistrate.all.index_by { |m| m.email.to_s.downcase }
      @courthouses_by_name = Courthouse.all.index_by(&:name)
      @sitting_types_by_name = SittingType.all.index_by(&:name)
      @progress.finish_phase
    end

    def seed_canonical_courthouses!
      Domain::LOCATIONS.each { |location| courthouse_for!(location) }
    end

    def sitting_type_for!(business_type)
      clean = normalize_name(business_type) || "General"
      cached = @sitting_types_by_name[clean]
      return cached if cached&.persisted? && SittingType.exists?(cached.id)

      @sitting_types_by_name[clean] = SittingType.find_or_create_by!(name: clean) do |type|
        type.code = clean.parameterize(separator: "_")
      end
    end

    def magistrate_for!(email:, title: nil, first_name:, last_name:, **attrs)
      key = normalize_email(email)
      raise "Missing magistrate email for #{first_name} #{last_name}" if key.blank?

      cached = @magistrates_by_email[key]
      record = ensure_magistrate_persisted!(cached) if cached
      record ||= Magistrate.find_by(email: key)
      record ||= Magistrate.new(email: key)
      record.assign_attributes(
        title: title || record.title,
        first_name: first_name,
        last_name: last_name,
        cluster: CLUSTER,
        bench: BENCH,
        **attrs
      )
      record.save!
      cache_magistrate!(record)
    end

    def cache_magistrate!(magistrate)
      return nil unless magistrate

      key = normalize_email(magistrate.email)
      unless key.present?
        return magistrate if magistrate.persisted? && Magistrate.exists?(magistrate.id)

        return nil
      end

      reloaded = Magistrate.find_by(email: key)
      if reloaded
        @magistrates_by_email[key] = reloaded
        return reloaded
      end

      @magistrates_by_email.delete(key)
      nil
    end

    def ensure_magistrate_persisted!(magistrate)
      return nil unless magistrate

      if magistrate.persisted? && Magistrate.exists?(magistrate.id)
        cache_magistrate!(magistrate)
        return magistrate
      end

      key = normalize_email(magistrate.email)
      if key.present?
        reloaded = Magistrate.find_by(email: key)
        return cache_magistrate!(reloaded) if reloaded
      end

      reloaded = Magistrate.where(
        "LOWER(first_name) = ? AND LOWER(last_name) = ?",
        magistrate.first_name.to_s.strip.downcase,
        magistrate.last_name.to_s.strip.downcase
      ).first
      cache_magistrate!(reloaded) if reloaded
    end

    def import_key_for(parts)
      Digest::SHA256.hexdigest(parts.map { |p| p.to_s.strip.downcase }.join("|"))
    end

    def upsert_sitting!(magistrate:, courthouse:, sitting_type:, session_date:, session:, status:, source:, **attrs)
      magistrate = ensure_magistrate_persisted!(magistrate)
      unless magistrate
        stats[:sittings_skipped_no_magistrate] += 1
        return
      end

      unless courthouse&.persisted? && Courthouse.exists?(courthouse.id)
        stats[:sittings_skipped_no_courthouse] += 1
        return
      end

      unless sitting_type&.persisted? && SittingType.exists?(sitting_type.id)
        stats[:sittings_skipped_no_sitting_type] += 1
        return
      end

      key = import_key_for([
        magistrate.email,
        session_date,
        session,
        courthouse.name,
        attrs[:venue_name],
        sitting_type.name,
        attrs[:panel],
        attrs[:position],
        status,
        source
      ])

      sitting = Sitting.find_or_initialize_by(import_key: key)
      if sitting.persisted?
        stats[:sittings_skipped] += 1
        return
      end

      sitting.assign_attributes(
        magistrate:,
        courthouse:,
        sitting_type:,
        session_date:,
        session:,
        status:,
        import_source: source,
        import_key: key,
        vacated: status == "vacated",
        court_type: attrs[:court_type] || Domain.court_type_for_panel(attrs[:panel]),
        sitting_position: attrs[:sitting_position] || Domain.normalize_position(attrs[:position]),
        court_room: attrs[:court_room] || Domain.normalize_court_room(attrs[:venue_name]),
        cancellation_category: attrs[:cancellation_category],
        **attrs.except(:court_type, :sitting_position, :court_room, :cancellation_category)
      )
      sitting.save!
      stats[:"sittings_#{status}"] += 1
    end

    def rows_after_header(sheet, header_first_cell)
      rows = sheet.parse
      header_index = rows.index { |row| row[0].to_s.strip == header_first_cell }
      raise "Header #{header_first_cell.inspect} not found in #{sheet.name}" unless header_index

      rows[(header_index + 1)..].filter_map do |row|
        next if row.blank? || row.compact.blank?
        next if summary_row?(row)

        row
      end
    end

    def summary_row?(row)
      cells = row.map { |cell| cell.to_s.strip }
      return true if cells[0].in?(%w[Surname Magistrate Total TOTAL])
      return true if cells.any? { |cell| cell.match?(/\A(?:family\s+)?totals?\z/i) }

      false
    end

    def overview_rows(sheet)
      rows_after_header(sheet, "Magistrate").select { |row| normalize_email(row[27]).present? }
    end

    def appraisal_rows(sheet)
      rows_after_header(sheet, "Magistrate").select { |row| normalize_email(row[9]).present? }
    end

    def report_rows(sheet)
      rows_after_header(sheet, "Title")
    end

    def surname_rows(sheet)
      rows_after_header(sheet, "Surname")
    end

    def import_magistrates_from_overview!
      sheet = open_sheet(:summary, "Overview")
      rows = overview_rows(sheet)
      @progress.phase("importing magistrates from overview", rows.size)

      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction do
          rows.each do |row|
            magistrate_for!(
              email: row[27],
              title: row[1],
              first_name: row[2],
              last_name: row[0],
              middle_name: normalize_name(row[3]),
              frequency: normalize_name(row[4]),
              sitting_pattern: normalize_name(row[26]) || normalize_name(row[5]),
              date_of_appointment: parse_date(row[23]),
              leaving_date: parse_date(row[25]),
              active: row[25].blank?,
              cluster: CLUSTER,
              bench: BENCH,
              presiding_justice: row[8].to_i.positive? || normalize_name(row[23]).present?,
              appraisal_status: normalize_name(row[21]).present? ? "new" : "post_threshold",
              appraisal_cycle_years: Domain.appraisal_cycle_years(presiding_justice: row[8].to_i.positive? || normalize_name(row[23]).present?)
            )
            stats[:magistrates] += 1
            @progress.tick
          end
        end
      end
      @progress.finish_phase
    end

    def enrich_from_rota!
      sheet = open_sheet(:rota, "Northeast Rota Last Login")
      rows = sheet.parse[1..].reject { |row| row.compact.blank? }
      @progress.phase("enriching magistrates from rota", rows.size)

      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction do
          rows.each do |row|
            magistrate_for!(
              email: row[4],
              title: row[1],
              first_name: row[2],
              last_name: row[3],
              active: true,
              cluster: CLUSTER,
              bench: BENCH
            )
            stats[:rota_magistrates] += 1
            @progress.tick
          end
        end
      end
      @progress.finish_phase
    end

    def import_home_courthouses_from_location_breakdown!
      sheet = open_sheet(:summary, "Location Breakdown")
      rows = sheet.parse
      header_index = rows.index { |row| row[0].to_s.strip == "Magistrate" }
      location_columns = {
        6 => "Barnsley",
        9 => "Doncaster",
        12 => "Sheffield",
        13 => "Sheffield"
      }

      data_rows = rows[(header_index + 2)..].reject(&:blank?)
      @progress.phase("assigning home courthouses", data_rows.size)

      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction do
          data_rows.each do |row|
            magistrate = ensure_magistrate_persisted!(find_magistrate_by_name(row[2], row[0]))
            unless magistrate
              stats[:home_courthouses_skipped_no_magistrate] += 1
              @progress.tick
              next
            end

            counts = location_columns.values.index_with { 0 }
            location_columns.each { |idx, name| counts[name] += row[idx].to_i }
            top_name, top_count = counts.max_by { |_, count| count }
            next if top_count.zero?

            magistrate.update!(home_courthouse: courthouse_for!(top_name))

            counts.each do |name, count|
              next if count.zero?

              courthouse = courthouse_for!(name)
              magistrate.magistrate_sitting_locations.find_or_create_by!(courthouse:)
            end

            stats[:home_courthouses] += 1
            @progress.tick
          end
        end
      end
      @progress.finish_phase
    end

    def import_leaves_from_appraisal!
      sheet = open_sheet(:summary, "Appraisal & LoA")
      rows = appraisal_rows(sheet)
      @progress.phase("importing leaves of absence", rows.size)

      ActiveRecord::Base.connection_pool.with_connection do
        ActiveRecord::Base.transaction do
          rows.each do |row|
            magistrate = ensure_magistrate_persisted!(find_magistrate(row[9], row[2], row[0]))
            unless magistrate
              stats[:leaves_skipped_no_magistrate] += 1
              @progress.tick
              next
            end

            if row[4].present? || row[5].present?
              magistrate.update!(
                leaving_date: parse_date(row[4]) || magistrate.leaving_date,
                leaving_reason: normalize_name(row[5]),
                active: row[4].blank?,
                last_appraisal_on: parse_date(row[6]) || magistrate.last_appraisal_on,
                last_appraiser: normalize_name(row[7]) || magistrate.last_appraiser,
                appraisal_status: row[17].present? ? "post_threshold" : magistrate.appraisal_status
              )
            end

            starts_on = parse_date(row[18])
            ends_on = parse_date(row[19])
            if starts_on.present?
              LeaveOfAbsence.create!(
                magistrate:,
                starts_on:,
                ends_on:,
                reason: normalize_name(row[20]),
                notes: normalize_name(row[21])
              )
              stats[:leaves] += 1
            end
            @progress.tick
          end
        end
      end
      @progress.finish_phase
    end

    def import_completed_sittings!(kind)
      case kind
      when :populated_by_ra
        sheet = open_sheet(:vacancy, "Populated by RA")
        source = "populated_by_ra"
        label = "importing completed sittings (populated by RA)"
      when :accepted_by_magistrate
        sheet = open_sheet(:vacancy, "Accepted by Magistrate - in LJA")
        source = "accepted_by_magistrate"
        label = "importing completed sittings (accepted by magistrate)"
      else
        raise "Unknown sitting import kind: #{kind}"
      end

      rows = surname_rows(sheet)
      with_batched_rows(label, rows) do |row|
        magistrate = resolve_magistrate_for_sitting_row!(row, format: :vacancy)
        unless magistrate
          stats[:sittings_skipped_no_magistrate] += 1
          @progress.warn(
            "completed sitting row skipped — no magistrate for #{row[0]} #{row[2]}"
          )
          next
        end

        courthouse = courthouse_for_existing!(row[12])
        unless courthouse
          stats[:sittings_skipped_no_courthouse] += 1
          @progress.warn("completed sitting row skipped — missing courthouse for #{row[0]} #{row[2]}")
          next
        end

        sitting_type = sitting_type_for!(row[8])
        session_date = parse_date(row[5])
        unless session_date
          stats[:sittings_skipped_no_date] += 1
          next
        end

        upsert_sitting!(
          magistrate:,
          courthouse:,
          sitting_type:,
          session_date:,
          session: normalize_name(row[6]),
          status: "completed",
          source:,
          venue_name: normalize_name(row[11]),
          position: normalize_name(row[10]),
          panel: normalize_name(row[9]),
          business_type: normalize_name(row[8]),
          justice_area: normalize_name(row[4]),
          ad_hoc: normalize_name(row[13]) == "Y"
        )
      end
    end

    def import_vacated_sittings!
      sheet = open_sheet(:vacated, "Report")
      rows = report_rows(sheet)

      with_batched_rows("importing vacated sittings", rows) do |row|
        magistrate = resolve_magistrate_for_sitting_row!(row, format: :report)
        unless magistrate
          stats[:sittings_skipped_no_magistrate] += 1
          @progress.warn("vacated row skipped — no magistrate for #{row[1]} #{row[2]} (#{row[3]})")
          next
        end

        courthouse = courthouse_for_existing!(row[7])
        unless courthouse
          stats[:sittings_skipped_no_courthouse] += 1
          @progress.warn("vacated row skipped — missing courthouse for #{row[1]} #{row[2]}")
          next
        end

        sitting_type = sitting_type_for!(row[16])
        session_date = parse_date(row[4])
        unless session_date
          stats[:vacated_skipped_no_date] += 1
          @progress.warn("vacated row skipped — invalid session date for #{row[1]} #{row[2]} on #{row[4].inspect}")
          next
        end

        upsert_sitting!(
          magistrate:,
          courthouse:,
          sitting_type:,
          session_date:,
          session: normalize_name(row[5]),
          status: "vacated",
          source: "vacated",
          venue_name: normalize_name(row[6]),
          position: normalize_name(row[15]),
          panel: normalize_name(row[14]),
          business_type: normalize_name(row[16]),
          justice_area: normalize_name(row[8]),
          event_at: parse_datetime(row[9]),
          notice_days: row[10].to_i,
          action_reason: normalize_name(row[11]),
          action_by: normalize_name(row[12]),
          cancellation_category: Domain.cancellation_category(
            reason: normalize_name(row[11]),
            action_by: normalize_name(row[12])
          )
        )
      end
    end

    def import_cancelled_sittings!
      sheet = open_sheet(:cancelled, "Report")
      rows = report_rows(sheet)

      with_batched_rows("importing cancelled sittings", rows) do |row|
        magistrate = resolve_magistrate_for_sitting_row!(row, format: :report)
        unless magistrate
          stats[:sittings_skipped_no_magistrate] += 1
          @progress.warn("cancelled row skipped — no magistrate for #{row[1]} #{row[2]} (#{row[3]})")
          next
        end

        courthouse = courthouse_for_existing!(row[10])
        unless courthouse
          stats[:sittings_skipped_no_courthouse] += 1
          @progress.warn("cancelled row skipped — missing courthouse for #{row[1]} #{row[2]}")
          next
        end

        sitting_type = sitting_type_for!(row[8])
        session_date = parse_date(row[4])
        unless session_date
          stats[:cancelled_skipped_no_date] += 1
          @progress.warn("cancelled row skipped — invalid session date for #{row[1]} #{row[2]} on #{row[4].inspect}")
          next
        end

        upsert_sitting!(
          magistrate:,
          courthouse:,
          sitting_type:,
          session_date:,
          session: normalize_name(row[5]),
          status: "cancelled",
          source: "cancelled",
          venue_name: normalize_name(row[9]),
          position: normalize_name(row[7]),
          panel: normalize_name(row[6]),
          business_type: normalize_name(row[8]),
          justice_area: normalize_name(row[11]),
          event_at: parse_datetime(row[12]),
          notice_days: row[13].to_i,
          action_reason: normalize_name(row[14]),
          action_by: normalize_name(row[15]),
          cancellation_category: Domain.cancellation_category(
            reason: normalize_name(row[14]),
            action_by: normalize_name(row[15])
          )
        )
      end
    end

    def infer_email(first_name, surname)
      find_magistrate_by_name(first_name, surname)&.email
    end

    def sitting_row_identity(row, format:)
      case format
      when :vacancy
        {
          surname: normalize_name(row[0]),
          title: normalize_name(row[1]),
          forenames: normalize_name(row[2]),
          email: infer_email(row[2], row[0])
        }
      when :report
        {
          surname: normalize_name(row[1]),
          title: normalize_name(row[0]),
          forenames: normalize_name(row[2]),
          email: normalize_email(row[3])
        }
      else
        raise "Unknown sitting row format: #{format}"
      end
    end

    def resolve_magistrate_for_sitting_row!(row, format:)
      identity = sitting_row_identity(row, format:)
      magistrate = find_magistrate(identity[:email], identity[:forenames], identity[:surname])
      magistrate ||= find_or_create_magistrate_from_sitting_row!(identity)
      ensure_magistrate_persisted!(magistrate)
    end

    def find_or_create_magistrate_from_sitting_row!(identity)
      surname = identity[:surname]
      forenames = identity[:forenames]
      return nil if surname.blank? || forenames.blank?

      existing = find_magistrate_by_name(forenames, surname)
      return existing if existing

      email = identity[:email] || placeholder_email_for(forenames, surname)
      return nil if email.blank?

      key = normalize_email(email)
      existing = Magistrate.find_by(email: key)
      return cache_magistrate!(existing) if existing

      magistrate = magistrate_for!(
        email:,
        title: identity[:title],
        first_name: forenames,
        last_name: surname,
        active: true,
        cluster: CLUSTER,
        bench: BENCH
      )
      stats[:magistrates_created_from_sittings] += 1
      magistrate
    end

    def placeholder_email_for(first_name, last_name)
      fn = first_name.to_s.strip.downcase.gsub(/[^a-z0-9]+/, ".")
      ln = last_name.to_s.strip.downcase.gsub(/[^a-z0-9]+/, ".")
      return nil if fn.blank? || ln.blank?

      base = "#{fn}.#{ln}.jp@ejudiciary.net"
      return base unless email_taken?(base)

      2.upto(99) do |i|
        candidate = "#{fn}.#{ln}.#{i}.jp@ejudiciary.net"
        return candidate unless email_taken?(candidate)
      end
      nil
    end

    def email_taken?(email)
      key = normalize_email(email)
      return false if key.blank?

      @magistrates_by_email.key?(key) || Magistrate.exists?(email: key)
    end

    def find_magistrate(email, first_name, surname)
      key = normalize_email(email)
      if key.present?
        cached = @magistrates_by_email[key]
        verified = ensure_magistrate_persisted!(cached)
        return verified if verified

        db_record = Magistrate.find_by(email: key)
        return cache_magistrate!(db_record) if db_record
      end

      find_magistrate_by_name(first_name, surname)
    end

    def find_magistrate_by_name(first_name, surname)
      fn = first_name.to_s.strip
      sn = surname.to_s.strip
      return nil if fn.blank? || sn.blank?

      cached = @magistrates_by_email.values.find do |m|
        m.first_name.casecmp?(fn) && m.last_name.casecmp?(sn)
      end
      verified = ensure_magistrate_persisted!(cached)
      return verified if verified

      db_record = Magistrate.where(
        "LOWER(first_name) = ? AND LOWER(last_name) = ?",
        fn.downcase,
        sn.downcase
      ).first
      cache_magistrate!(db_record) if db_record
    end
  end
end
