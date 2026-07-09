# frozen_string_literal: true

class RenameCancellationCategories < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL.squish
      UPDATE sittings SET cancellation_category = 'hmcts' WHERE cancellation_category = 'legal_admin'
    SQL
    execute <<~SQL.squish
      UPDATE sittings SET cancellation_category = 'unknown' WHERE cancellation_category = 'other'
    SQL
  end

  def down
    execute <<~SQL.squish
      UPDATE sittings SET cancellation_category = 'legal_admin' WHERE cancellation_category = 'hmcts'
    SQL
    execute <<~SQL.squish
      UPDATE sittings SET cancellation_category = 'other' WHERE cancellation_category = 'unknown'
    SQL
  end
end
