# frozen_string_literal: true

module Orion
  class DataDeduper
    SITTING_GROUP_SQL = <<~SQL.squish
      magistrate_id,
      session_date,
      COALESCE(TRIM(session), ''),
      courthouse_id
    SQL

    MAGISTRATE_ASSOCIATIONS = %i[
      sittings cases leaves_of_absence training_records
    ].freeze

    attr_reader :stats

    def initialize(dry_run: false)
      @dry_run = dry_run
      @stats = Hash.new(0)
    end

    def dedupe!(sittings: true, magistrates: true, leaves: true, training: true)
      dedupe_magistrates! if magistrates
      dedupe_sittings! if sittings
      dedupe_leaves! if leaves
      dedupe_training_records! if training
      stats
    end

    def dedupe_sittings!
      groups = sitting_duplicate_groups
      @stats[:sitting_duplicate_groups] = groups.size

      groups.each_value do |rows|
        keeper = pick_sitting_keeper(rows)
        losers = rows.reject { |row| row["id"] == keeper["id"] }

        losers.each do |row|
          @stats[:sittings_removed] += 1
          delete_sitting!(row["id"]) unless @dry_run
        end

        canonical_key = SittingImportKey.from_sitting(Sitting.includes(:magistrate, :courthouse, :sitting_type).find(keeper["id"]))
        next if keeper["import_key"] == canonical_key

        @stats[:sitting_import_keys_updated] += 1
        Sitting.where(id: keeper["id"]).update_all(import_key: canonical_key, updated_at: Time.current) unless @dry_run
      end
    end

    def dedupe_magistrates!
      groups = magistrate_duplicate_groups
      @stats[:magistrate_duplicate_groups] = groups.size

      groups.each_value do |records|
        keeper = pick_magistrate_keeper(records)
        duplicates = records.reject { |m| m.id == keeper.id }

        duplicates.each do |duplicate|
          @stats[:magistrates_merged] += 1
          merge_magistrate!(keeper, duplicate) unless @dry_run
        end
      end
    end

    def dedupe_leaves!
      sql = <<~SQL
        SELECT magistrate_id, starts_on, COALESCE(ends_on, DATE '9999-12-31'), COALESCE(reason, ''), array_agg(id ORDER BY id) AS ids
        FROM leaves_of_absence
        GROUP BY magistrate_id, starts_on, COALESCE(ends_on, DATE '9999-12-31'), COALESCE(reason, '')
        HAVING COUNT(*) > 1
      SQL

      ActiveRecord::Base.connection.exec_query(sql).each do |row|
        ids = parse_pg_array(row["ids"])
        @stats[:leave_duplicate_groups] += 1
        ids.drop(1).each do |id|
          @stats[:leaves_removed] += 1
          delete_leave!(id) unless @dry_run
        end
      end
    end

    def dedupe_training_records!
      sql = <<~SQL
        SELECT magistrate_id, session_date, COALESCE(description, ''), array_agg(id ORDER BY id) AS ids
        FROM training_records
        GROUP BY magistrate_id, session_date, COALESCE(description, '')
        HAVING COUNT(*) > 1
      SQL

      ActiveRecord::Base.connection.exec_query(sql).each do |row|
        ids = parse_pg_array(row["ids"])
        @stats[:training_duplicate_groups] += 1
        ids.drop(1).each do |id|
          @stats[:training_records_removed] += 1
          delete_training_record!(id) unless @dry_run
        end
      end
    end

    def sitting_duplicate_groups
      sql = <<~SQL
        SELECT id, magistrate_id, session_date, session, courthouse_id, status, import_key, updated_at
        FROM sittings
        WHERE (magistrate_id, session_date, COALESCE(TRIM(session), ''), courthouse_id) IN (
          SELECT magistrate_id, session_date, COALESCE(TRIM(session), ''), courthouse_id
          FROM sittings
          GROUP BY magistrate_id, session_date, COALESCE(TRIM(session), ''), courthouse_id
          HAVING COUNT(*) > 1
        )
        ORDER BY magistrate_id, session_date, session, courthouse_id, id
      SQL

      ActiveRecord::Base.connection.exec_query(sql).group_by do |row|
        [row["magistrate_id"], row["session_date"], row["session"].to_s.strip, row["courthouse_id"]]
      end
    end

    def magistrate_duplicate_groups
      Magistrate.all.group_by { |m| [m.first_name.to_s.strip.downcase, m.last_name.to_s.strip.downcase] }
        .select { |_key, records| records.size > 1 }
    end

    private

    def pick_sitting_keeper(rows)
      rows.max_by do |row|
        [
          SittingImportKey.status_priority(row["status"]),
          row["updated_at"],
          row["id"]
        ]
      end
    end

    def pick_magistrate_keeper(records)
      records.max_by do |magistrate|
        [
          magistrate_score(magistrate),
          magistrate.sittings.count,
          magistrate.updated_at,
          magistrate.id
        ]
      end
    end

    def magistrate_score(magistrate)
      score = 0
      email = magistrate.email.to_s.strip.downcase
      score += 4 if email.present? && !placeholder_email?(email)
      score += 2 if magistrate.reference_code.present?
      score += 1 if magistrate.home_courthouse_id.present?
      score += 1 if magistrate.date_of_appointment.present?
      score
    end

    def placeholder_email?(email)
      email.match?(/\.jp@ejudiciary\.net\z/)
    end

    def merge_magistrate!(keeper, duplicate)
      ActiveRecord::Base.transaction do
        MAGISTRATE_ASSOCIATIONS.each do |association|
          duplicate.public_send(association).update_all(magistrate_id: keeper.id)
        end

        duplicate.magistrate_sitting_locations.find_each do |location|
          keeper.magistrate_sitting_locations.find_or_create_by!(courthouse_id: location.courthouse_id)
        end

        if keeper.home_courthouse_id.nil? && duplicate.home_courthouse_id.present?
          keeper.update!(home_courthouse_id: duplicate.home_courthouse_id)
        end

        %i[title middle_name email date_of_appointment reasonable_adjustments frequency sitting_pattern
           leaving_date leaving_reason bench_role appraisal_status appraisal_cycle_years presiding_justice
           last_appraisal_on last_appraiser last_login_on days_since_login reference_code].each do |attr|
          next if keeper.public_send(attr).present?

          value = duplicate.public_send(attr)
          keeper.update!(attr => value) if value.present?
        end

        duplicate.destroy!
      end
    end

    def delete_sitting!(id)
      Sitting.where(id: id).delete_all
    end

    def delete_leave!(id)
      LeaveOfAbsence.where(id: id).delete_all
    end

    def delete_training_record!(id)
      TrainingRecord.where(id: id).delete_all
    end

    def parse_pg_array(value)
      value.to_s.gsub(/[{}]/, "").split(",").reject(&:blank?).map(&:to_i)
    end
  end
end
