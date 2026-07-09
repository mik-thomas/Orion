# frozen_string_literal: true

class AddUniqueSittingEventIndex < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def up
    dedupe_sittings_if_needed!

    add_index :sittings,
              "magistrate_id, session_date, COALESCE(session, ''), courthouse_id",
              unique: true,
              name: "index_sittings_on_unique_event",
              algorithm: :concurrently,
              if_not_exists: true
  end

  def down
    remove_index :sittings, name: "index_sittings_on_unique_event", if_exists: true
  end

  private

  def dedupe_sittings_if_needed!
    duplicate_groups = select_value(<<~SQL)
      SELECT COUNT(*) FROM (
        SELECT 1
        FROM sittings
        GROUP BY magistrate_id, session_date, COALESCE(session, ''), courthouse_id
        HAVING COUNT(*) > 1
      ) duplicates
    SQL
    return if duplicate_groups.to_i.zero?

    say_with_time "Removing #{duplicate_groups} duplicate sitting groups before unique index" do
      Orion::DataDeduper.new.dedupe!(magistrates: false, leaves: false, training: false)
    end
  end
end
