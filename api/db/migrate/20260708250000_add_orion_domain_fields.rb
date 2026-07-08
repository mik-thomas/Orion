class AddOrionDomainFields < ActiveRecord::Migration[7.1]
  def change
    change_table :courthouses, bulk: true do |t|
      t.string :cluster, null: false, default: "North West"
      t.string :bench, null: false, default: "South Yorkshire"
    end

    change_table :magistrates, bulk: true do |t|
      t.string :cluster, null: false, default: "North West"
      t.string :bench_role
      t.string :appraisal_status
      t.integer :appraisal_cycle_years
      t.boolean :presiding_justice, null: false, default: false
      t.date :last_appraisal_on
      t.string :last_appraiser
    end

    change_table :sittings, bulk: true do |t|
      t.string :court_type
      t.string :sitting_position
      t.string :court_room
      t.string :cancellation_category
    end

    add_index :sittings, :court_type
    add_index :sittings, :sitting_position
  end
end
