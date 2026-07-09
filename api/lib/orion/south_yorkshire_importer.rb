# frozen_string_literal: true

require "digest"
require "roo"
require "set"

module Orion
  class SouthYorkshireImporter
    DATA_ROOT = ENV.fetch("ORION_IMPORT_ROOT", "/Users/michaelthomas/Desktop/Courts")
    CLUSTER = Domain::CLUSTER
    BENCH = Domain::BENCH
    SITTING_BATCH_SIZE = 2000
    INFER_COMPLETE_RATIO = 0.95

    FILES = {
      summary: "SITTINGSUMMARY - South Yorkshire 01.04.2025-31.03.2026.xlsx",
      cancelled: "South Yorkshire CANCELLED_SITTINGS April 2025- March 2026.xlsx",
      vacancy: "South Yorkshire VACANCY_ASSIGNMENT_HISTORY April 2025 - March 2026.xlsx",
      vacated: "South Yorkshire VACATED_SITTINGS 2025-2026.xlsx",
      rota: "Removed Magistrates/South Yorkshire-Rota Jul 26.xlsx"
    }.freeze

    def initialize(root: DATA_ROOT, clear: true, resume: false, progress: ImportProgressReporter.new)
      @root = Pathname(root)
      @resume = resume
      @clear = clear && !resume
      @progress = progress
      @magistrates_by_email = {}
      @magistrates_by_name = {}
      @courthouses_by_name = {}
      @sitting_types_by_name = {}
      @known_import_statuses = nil
      @known_unique_events = nil
      @lookup_caches_warm = false
      @stats = Hash.new(0)
      @checkpoint = nil
    end

    attr_reader :stats

    def import!
      validate_files!
      setup_checkpoint!
      register_interrupt_handler!

      @progress.message("Starting South Yorkshire import from #{@root}")
      @progress.message("Importer: #{importer_version}")
      @progress.message("Mode: #{@resume ? 'resume' : (@clear ? 'full (clear existing)' : 'incremental')}")

      if @clear
        run_transaction_phase("clear_existing", "clearing existing data") { clear_existing! }
      elsif @resume
        @progress.message("Skipping clear — resume mode preserves existing data")
      end

      run_transaction_phase("seed_canonical_courthouses", "seeding courthouses") do
        seed_canonical_courthouses!
      end
      import_magistrates_from_overview!
      enrich_from_rota!
      warm_lookup_caches!("warm_lookup_caches_1")
      import_home_courthouses_from_location_breakdown!
      import_leaves_from_appraisal!
      warm_lookup_caches!("warm_lookup_caches_2")
      import_completed_sittings!(:populated_by_ra)
      import_completed_sittings!(:accepted_by_magistrate)
      warm_lookup_caches!("warm_lookup_caches_3")
      import_vacated_sittings!
      import_cancelled_sittings!

      @checkpoint.clear!
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
      @magistrates_by_name = {}
      @courthouses_by_name = {}
      @sitting_types_by_name = {}
      @known_import_statuses = nil
      @known_unique_events = nil
      @lookup_caches_warm = false
    end

    def importer_version
      "2026-07-09d (unique_event batch dedupe)"
    end

    def setup_checkpoint!
      @checkpoint = ImportCheckpoint.new(root: @root, importer_version: importer_version)

      if @resume
        if @checkpoint.exists?
          @checkpoint.load!
          completed = @checkpoint.completed_phase_keys
          @progress.message(
            "Resuming from checkpoint at #{@checkpoint.updated_at} " \
            "(#{completed.size} phases complete)"
          )
        else
          @progress.message("No checkpoint file at #{ImportCheckpoint.path}")
          @progress.message("Inferring progress from database — existing data will not be truncated")
          @checkpoint.synthesize! { |cp| infer_checkpoint_from_db!(cp) }
          completed = @checkpoint.completed_phase_keys
          if completed.any?
            @progress.message(
              "Synthetic checkpoint: #{completed.size} phases marked complete " \
              "(#{completed.join(', ')})"
            )
          else
            @progress.message("No completed phases inferred — running all phases (idempotent)")
          end
          @progress.message("Sitting rows deduplicated by import_key — safe to re-run")
        end
      else
        @checkpoint.reset!
      end
    end

    def register_interrupt_handler!
      return unless @resume

      previous = Signal.trap("INT") do
        @checkpoint&.flush!
        @progress.message(
          "Interrupted — checkpoint saved at #{ImportCheckpoint.path}. " \
          "Resume with: npm run import:south-yorkshire -- --resume"
        )
        previous&.call
        exit 130
      end
    end

    def infer_checkpoint_from_db!(checkpoint)
      checkpoint.complete_phase!("clear_existing")

      if Courthouse.count >= Domain::LOCATIONS.size
        checkpoint.complete_phase!("seed_canonical_courthouses")
      end

      overview_total = overview_rows(open_sheet(:summary, "Overview")).size
      if overview_total.positive? && Magistrate.count >= (overview_total * INFER_COMPLETE_RATIO).ceil
        checkpoint.complete_phase!("import_magistrates_from_overview")
      end

      rota_total = open_sheet(:rota, "Northeast Rota Last Login").parse[1..]&.count { |row| row.compact.present? } || 0
      if rota_total.positive? && Magistrate.where.not(last_login_on: nil).count >= (rota_total * INFER_COMPLETE_RATIO).ceil
        checkpoint.complete_phase!("enrich_from_rota")
      end

      if Magistrate.where.not(home_courthouse_id: nil).count >= (overview_total * INFER_COMPLETE_RATIO).ceil
        checkpoint.complete_phase!("import_home_courthouses")
      end

      appraisal_total = appraisal_rows(open_sheet(:summary, "Appraisal & LoA")).size
      if appraisal_total.positive? && LeaveOfAbsence.count >= (appraisal_total * INFER_COMPLETE_RATIO).ceil
        checkpoint.complete_phase!("import_leaves")
      end

      infer_sitting_phase_complete!(
        checkpoint,
        "import_completed_sittings_populated_by_ra",
        "populated_by_ra",
        surname_rows(open_sheet(:vacancy, "Populated by RA")).size
      )
      infer_sitting_phase_complete!(
        checkpoint,
        "import_completed_sittings_accepted_by_magistrate",
        "accepted_by_magistrate",
        surname_rows(open_sheet(:vacancy, "Accepted by Magistrate - in LJA")).size
      )
      infer_sitting_phase_complete!(
        checkpoint,
        "import_vacated_sittings",
        "vacated",
        report_rows(open_sheet(:vacated, "Report")).size
      )
      infer_sitting_phase_complete!(
        checkpoint,
        "import_cancelled_sittings",
        "cancelled",
        report_rows(open_sheet(:cancelled, "Report")).size
      )

      %w[warm_lookup_caches_1 warm_lookup_caches_2 warm_lookup_caches_3].each do |key|
        checkpoint.complete_phase!(key) if checkpoint.phase_complete?("import_magistrates_from_overview")
      end
    end

    def infer_sitting_phase_complete!(checkpoint, phase_key, source, expected_rows)
      return unless expected_rows.positive?

      imported = Sitting.where(import_source: source).count
      checkpoint.complete_phase!(phase_key) if imported >= (expected_rows * INFER_COMPLETE_RATIO).ceil
    end

    def phase_complete?(key)
      @resume && @checkpoint.phase_complete?(key)
    end

    def skip_phase!(label)
      @progress.message("Skipping completed phase: #{label}")
    end

    def run_transaction_phase(phase_key, label)
      return skip_phase!(label) if phase_complete?(phase_key)

      @checkpoint.start_phase!(phase_key)
      with_connection_transaction(label) { yield }
      @checkpoint.complete_phase!(phase_key)
    end

    def with_checkpointed_rows(label, rows, phase_key:)
      total = rows.size
      return skip_phase!(label) if phase_complete?(phase_key)

      offset = @resume ? @checkpoint.rows_processed(phase_key) : 0
      @progress.message("Resuming #{label} from row #{offset}/#{total}") if offset.positive?

      if offset >= total && total.positive?
        @checkpoint.complete_phase!(phase_key)
        @progress.phase(label, total)
        offset.times { @progress.tick }
        return @progress.finish_phase
      end

      rows = rows.drop(offset) if offset.positive?

      @checkpoint.start_phase!(phase_key, total: total)
      @progress.phase(label, total)
      offset.times { @progress.tick } if offset.positive?
      processed = offset

      if total.zero?
        @checkpoint.complete_phase!(phase_key)
        return @progress.finish_phase
      end

      rows.each_slice(SITTING_BATCH_SIZE) do |batch|
        ActiveRecord::Base.connection_pool.with_connection do
          ActiveRecord::Base.transaction do
            batch.each do |row|
              yield row
              processed += 1
              @progress.tick
            end
          end
        end
        @checkpoint.save_progress!(phase_key, processed, total: total)
      end

      @checkpoint.complete_phase!(phase_key)
      @progress.finish_phase
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

    def with_bulk_sitting_import(label, rows, phase_key:, status:, source:, format:)
      total = rows.size
      return skip_phase!(label) if phase_complete?(phase_key)

      ensure_import_keys_loaded!

      offset = @resume ? @checkpoint.rows_processed(phase_key) : 0
      @progress.message("Resuming #{label} from row #{offset}/#{total}") if offset.positive?

      if offset >= total && total.positive?
        @checkpoint.complete_phase!(phase_key)
        @progress.phase(label, total)
        offset.times { @progress.tick }
        return @progress.finish_phase
      end

      rows = rows.drop(offset) if offset.positive?

      @checkpoint.start_phase!(phase_key, total: total)
      @progress.phase(label, total)
      offset.times { @progress.tick } if offset.positive?
      processed = offset

      if total.zero?
        @checkpoint.complete_phase!(phase_key)
        return @progress.finish_phase
      end

      rows.each_slice(SITTING_BATCH_SIZE) do |batch|
        to_insert = []
        ActiveRecord::Base.connection_pool.with_connection do
          ActiveRecord::Base.transaction do
            batch.each do |row|
              begin
                attrs = build_sitting_attributes(row, status:, source:, format:)
                to_insert << attrs if attrs
              rescue StandardError => e
                stats[:rows_failed] += 1
                @progress.warn("#{label}: row skipped — #{e.class}: #{e.message}")
              end
            end
            bulk_insert_sittings!(to_insert, status) if to_insert.any?
          end
        end
        processed += batch.size
        @progress.tick(batch.size)
        @checkpoint.save_progress!(phase_key, processed, total: total)
      end

      @checkpoint.complete_phase!(phase_key)
      @progress.finish_phase
    end

    def ensure_import_keys_loaded!
      return if @known_import_statuses

      @known_import_statuses = {}
      @known_unique_events = {}
      Sitting.pluck(
        :import_key, :status, :id,
        :magistrate_id, :session_date, :session, :courthouse_id
      ).each do |import_key, st, id, magistrate_id, session_date, session, courthouse_id|
        if import_key.present?
          @known_import_statuses[import_key] = { status: st, id: id }
        end
        @known_unique_events[unique_event_key(magistrate_id, session_date, session, courthouse_id)] = {
          status: st, id: id, import_key: import_key
        }
      end
    end

    def unique_event_key(magistrate_id, session_date, session, courthouse_id)
      [magistrate_id, session_date, session.to_s.strip, courthouse_id].join("|")
    end

    def merge_sitting_record!(record, existing, stats_key: :sittings_upgraded)
      if SittingImportKey.status_priority(record[:status]) > SittingImportKey.status_priority(existing[:status])
        if existing[:id]
          Sitting.where(id: existing[:id]).update_all(
            record.except(:created_at).merge(updated_at: Time.current)
          )
        end
        stats[stats_key] += 1
        true
      else
        stats[:sittings_skipped] += 1
        false
      end
    end

    def track_sitting_caches!(record, id: nil)
      @known_import_statuses[record[:import_key]] = { status: record[:status], id: id }
      event_key = unique_event_key(record[:magistrate_id], record[:session_date], record[:session], record[:courthouse_id])
      @known_unique_events[event_key] = { status: record[:status], id: id, import_key: record[:import_key] }
    end

    def bulk_insert_sittings!(records, status)
      return if records.empty?

      inserts = []
      records.each do |record|
        existing = @known_import_statuses[record[:import_key]]
        if existing
          merge_sitting_record!(record, existing)
          next
        end

        event_key = unique_event_key(record[:magistrate_id], record[:session_date], record[:session], record[:courthouse_id])
        existing_event = @known_unique_events[event_key]
        if existing_event
          upgraded = merge_sitting_record!(record, existing_event)
          track_sitting_caches!(record, id: existing_event[:id]) if upgraded
          next
        end

        inserts << record
      end

      return if inserts.empty?

      # Same magistrate/session/courthouse can appear with different import_keys in one batch.
      by_event = inserts.each_with_object({}) do |record, memo|
        key = unique_event_key(record[:magistrate_id], record[:session_date], record[:session], record[:courthouse_id])
        existing = memo[key]
        if existing.nil? || SittingImportKey.status_priority(record[:status]) > SittingImportKey.status_priority(existing[:status])
          memo[key] = record
        else
          stats[:sittings_skipped] += 1
        end
      end
      inserts = by_event.values

      return if inserts.empty?

      Sitting.upsert_all(
        inserts,
        unique_by: :import_key,
        on_duplicate: :skip,
        record_timestamps: true
      )
      inserts.each { |record| track_sitting_caches!(record) }
      stats[:"sittings_#{status}"] += inserts.size
    end

    def build_sitting_attributes(row, status:, source:, format:)
      magistrate = resolve_magistrate_for_sitting_row!(row, format:)
      unless magistrate
        stats[:sittings_skipped_no_magistrate] += 1
        return nil
      end

      courthouse_col, sitting_type_col, date_col, session_col = sitting_columns_for(format, status:)
      courthouse = courthouse_for_existing!(row[courthouse_col])
      unless courthouse
        stats[:sittings_skipped_no_courthouse] += 1
        return nil
      end

      sitting_type = sitting_type_for!(row[sitting_type_col])
      session_date = parse_date(row[date_col])
      unless session_date
        stats[:"#{status}_skipped_no_date"] += 1
        return nil
      end

      extra = sitting_extra_attrs(row, format:, status:)
      session = normalize_name(row[session_col])
      venue_name = extra.delete(:venue_name)
      position = extra.delete(:position)
      panel = extra.delete(:panel)

      key = SittingImportKey.build(
        magistrate_email: magistrate.email,
        session_date: session_date,
        session: session,
        courthouse_name: courthouse.name,
        venue_name: venue_name,
        sitting_type_name: sitting_type.name,
        panel: panel,
        position: position
      )

      {
        magistrate_id: magistrate.id,
        courthouse_id: courthouse.id,
        sitting_type_id: sitting_type.id,
        session_date: session_date,
        session: session,
        status: status,
        import_source: source,
        import_key: key,
        vacated: status == "vacated",
        court_type: extra[:court_type] || Domain.court_type_for_panel(panel),
        sitting_position: extra[:sitting_position] || Domain.normalize_position(position),
        court_room: extra[:court_room] || Domain.normalize_court_room(venue_name),
        cancellation_category: extra[:cancellation_category],
        venue_name: venue_name,
        position: position,
        panel: panel,
        business_type: extra[:business_type],
        justice_area: extra[:justice_area],
        ad_hoc: extra[:ad_hoc] || false,
        event_at: extra[:event_at],
        notice_days: extra[:notice_days],
        action_reason: extra[:action_reason],
        action_by: extra[:action_by]
      }
    end

    def sitting_columns_for(format, status: nil)
      case format
      when :vacancy
        [12, 8, 5, 6]
      when :report
        if status == "cancelled"
          [10, 8, 4, 5]
        else
          [7, 16, 4, 5]
        end
      else
        raise "Unknown sitting row format: #{format}"
      end
    end

    def sitting_extra_attrs(row, format:, status:)
      case format
      when :vacancy
        {
          venue_name: normalize_name(row[11]),
          position: normalize_name(row[10]),
          panel: normalize_name(row[9]),
          business_type: normalize_name(row[8]),
          justice_area: normalize_name(row[4]),
          ad_hoc: normalize_name(row[13]) == "Y"
        }
      when :report
        if status == "cancelled"
          {
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
          }
        else
          {
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
          }
        end
      else
        raise "Unknown sitting row format: #{format}"
      end
    end

    def normalize_email(value)
      value.to_s.strip.downcase.presence
    end

    def normalize_name(value)
      value.to_s.strip.presence
    end

    def name_key(first_name, surname)
      "#{first_name.to_s.strip.downcase}|#{surname.to_s.strip.downcase}"
    end

    def index_magistrate_by_name!(magistrate)
      fn = magistrate.first_name
      sn = magistrate.last_name
      return if fn.blank? || sn.blank?

      @magistrates_by_name[name_key(fn, sn)] = magistrate
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
      return cached if cached&.persisted?

      @courthouses_by_name[canonical] = Courthouse.find_or_create_by!(name: canonical) do |c|
        c.cluster = CLUSTER
        c.bench = BENCH
      end
    end

    def courthouse_for_existing!(name)
      canonical = Domain.normalize_location(name)
      return nil if canonical.blank?

      cached = @courthouses_by_name[canonical]
      return cached if cached&.persisted?

      courthouse = Courthouse.find_by(name: canonical)
      @courthouses_by_name[canonical] = courthouse if courthouse
      courthouse
    end

    def warm_lookup_caches!(phase_key)
      return skip_phase!("warming lookup caches") if phase_complete?(phase_key)

      @checkpoint.start_phase!(phase_key)
      @progress.phase("warming lookup caches", 1)
      @magistrates_by_email = Magistrate.all.index_by { |m| m.email.to_s.downcase }
      @magistrates_by_name = {}
      @magistrates_by_email.each_value { |m| index_magistrate_by_name!(m) }
      @courthouses_by_name = Courthouse.all.index_by(&:name)
      @sitting_types_by_name = SittingType.all.index_by(&:name)
      @lookup_caches_warm = true
      @progress.finish_phase
      @checkpoint.complete_phase!(phase_key)
    end

    def seed_canonical_courthouses!
      Domain::LOCATIONS.each { |location| courthouse_for!(location) }
    end

    def sitting_type_for!(business_type)
      clean = normalize_name(business_type) || "General"
      cached = @sitting_types_by_name[clean]
      return cached if cached&.persisted?

      @sitting_types_by_name[clean] = SittingType.find_or_create_by!(name: clean) do |type|
        type.code = clean.parameterize(separator: "_")
      end
    end

    def magistrate_for!(email:, title: nil, first_name:, last_name:, **attrs)
      key = normalize_email(email)
      raise "Missing magistrate email for #{first_name} #{last_name}" if key.blank?

      cached = @magistrates_by_email[key]
      record = ensure_magistrate_persisted!(cached) if cached
      record ||= Magistrate.find_by(email: key) unless @lookup_caches_warm
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
      cache_magistrate!(record, trust: true)
    end

    def db_lookup
      yield
    rescue ActiveRecord::PreparedStatementCacheExpired, PG::FeatureNotSupported
      ActiveRecord::Base.connection_pool.disconnect!
      yield
    end

    def cache_magistrate!(magistrate, trust: false)
      return nil unless magistrate

      key = normalize_email(magistrate.email)
      if key.present?
        if trust || magistrate.persisted?
          @magistrates_by_email[key] = magistrate
          index_magistrate_by_name!(magistrate)
          return magistrate
        end

        reloaded = db_lookup { Magistrate.find_by(email: key) }
        if reloaded
          @magistrates_by_email[key] = reloaded
          index_magistrate_by_name!(reloaded)
          return reloaded
        end

        @magistrates_by_email.delete(key)
        return nil
      end

      magistrate if magistrate.persisted?
    end

    def cached_magistrate?(magistrate)
      key = normalize_email(magistrate.email)
      if key.present?
        return @magistrates_by_email[key]&.id == magistrate.id
      end

      @magistrates_by_name[name_key(magistrate.first_name, magistrate.last_name)]&.id == magistrate.id
    end

    def ensure_magistrate_persisted!(magistrate)
      return nil unless magistrate

      if magistrate.persisted?
        return magistrate if cached_magistrate?(magistrate) || @lookup_caches_warm

        return cache_magistrate!(magistrate, trust: true)
      end

      key = normalize_email(magistrate.email)
      if key.present?
        cached = @magistrates_by_email[key]
        return cached if cached&.persisted?

        reloaded = Magistrate.find_by(email: key) unless @lookup_caches_warm
        return cache_magistrate!(reloaded, trust: true) if reloaded
      end

      by_name = @magistrates_by_name[name_key(magistrate.first_name, magistrate.last_name)]
      return by_name if by_name&.persisted?

      return nil if @lookup_caches_warm

      reloaded = Magistrate.where(
        "LOWER(first_name) = ? AND LOWER(last_name) = ?",
        magistrate.first_name.to_s.strip.downcase,
        magistrate.last_name.to_s.strip.downcase
      ).first
      cache_magistrate!(reloaded, trust: true) if reloaded
    end

    def import_key_for(parts)
      SittingImportKey.digest(parts)
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

      with_checkpointed_rows("importing magistrates from overview", rows, phase_key: "import_magistrates_from_overview") do |row|
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
      end
    end

    def enrich_from_rota!
      sheet = open_sheet(:rota, "Northeast Rota Last Login")
      rows = sheet.parse[1..].reject { |row| row.compact.blank? }

      with_checkpointed_rows("enriching magistrates from rota", rows, phase_key: "enrich_from_rota") do |row|
        magistrate_for!(
          email: row[4],
          title: row[1],
          first_name: row[2],
          last_name: row[3],
          active: true,
          cluster: CLUSTER,
          bench: BENCH,
          last_login_on: parse_date(row[5]),
          days_since_login: row[6].present? ? row[6].to_i : nil
        )
        stats[:rota_magistrates] += 1
      end
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

      with_checkpointed_rows("assigning home courthouses", data_rows, phase_key: "import_home_courthouses") do |row|
        magistrate = ensure_magistrate_persisted!(find_magistrate_by_name(row[2], row[0]))
        unless magistrate
          stats[:home_courthouses_skipped_no_magistrate] += 1
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
      end
    end

    def import_leaves_from_appraisal!
      sheet = open_sheet(:summary, "Appraisal & LoA")
      rows = appraisal_rows(sheet)

      with_checkpointed_rows("importing leaves of absence", rows, phase_key: "import_leaves") do |row|
        magistrate = ensure_magistrate_persisted!(find_magistrate(row[9], row[2], row[0]))
        unless magistrate
          stats[:leaves_skipped_no_magistrate] += 1
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
      end
    end

    def import_completed_sittings!(kind)
      case kind
      when :populated_by_ra
        sheet = open_sheet(:vacancy, "Populated by RA")
        source = "populated_by_ra"
        label = "importing completed sittings (populated by RA)"
        phase_key = "import_completed_sittings_populated_by_ra"
      when :accepted_by_magistrate
        sheet = open_sheet(:vacancy, "Accepted by Magistrate - in LJA")
        source = "accepted_by_magistrate"
        label = "importing completed sittings (accepted by magistrate)"
        phase_key = "import_completed_sittings_accepted_by_magistrate"
      else
        raise "Unknown sitting import kind: #{kind}"
      end

      rows = surname_rows(sheet)
      with_bulk_sitting_import(label, rows, phase_key:, status: "completed", source:, format: :vacancy)
    end

    def import_vacated_sittings!
      sheet = open_sheet(:vacated, "Report")
      rows = report_rows(sheet)

      with_bulk_sitting_import(
        "importing vacated sittings",
        rows,
        phase_key: "import_vacated_sittings",
        status: "vacated",
        source: "vacated",
        format: :report
      )
    end

    def import_cancelled_sittings!
      sheet = open_sheet(:cancelled, "Report")
      rows = report_rows(sheet)

      with_bulk_sitting_import(
        "importing cancelled sittings",
        rows,
        phase_key: "import_cancelled_sittings",
        status: "cancelled",
        source: "cancelled",
        format: :report
      )
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
      existing = @magistrates_by_email[key] || (@lookup_caches_warm ? nil : Magistrate.find_by(email: key))
      return cache_magistrate!(existing, trust: true) if existing

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

      @magistrates_by_email.key?(key) || (!@lookup_caches_warm && Magistrate.exists?(email: key))
    end

    def find_magistrate(email, first_name, surname)
      key = normalize_email(email)
      if key.present?
        cached = @magistrates_by_email[key]
        verified = ensure_magistrate_persisted!(cached)
        return verified if verified

        unless @lookup_caches_warm
          db_record = Magistrate.find_by(email: key)
          return cache_magistrate!(db_record, trust: true) if db_record
        end
      end

      find_magistrate_by_name(first_name, surname)
    end

    def find_magistrate_by_name(first_name, surname)
      fn = first_name.to_s.strip
      sn = surname.to_s.strip
      return nil if fn.blank? || sn.blank?

      cached = @magistrates_by_name[name_key(fn, sn)]
      verified = ensure_magistrate_persisted!(cached)
      return verified if verified

      return nil if @lookup_caches_warm

      db_record = Magistrate.where(
        "LOWER(first_name) = ? AND LOWER(last_name) = ?",
        fn.downcase,
        sn.downcase
      ).first
      cache_magistrate!(db_record, trust: true) if db_record
    end
  end
end
