class ExtendMagistrateAndSittingImportFields < ActiveRecord::Migration[7.1]
  def change
    change_table :magistrates, bulk: true do |t|
      t.string :title
      t.string :middle_name
      t.string :frequency
      t.string :sitting_pattern
      t.date :leaving_date
      t.string :leaving_reason
      t.string :bench
      t.boolean :active, null: false, default: true
    end
    add_index :magistrates, :email

    change_table :sittings, bulk: true do |t|
      t.string :status, null: false, default: "completed"
      t.string :session
      t.string :venue_name
      t.string :position
      t.string :panel
      t.string :business_type
      t.string :justice_area
      t.boolean :ad_hoc, null: false, default: false
      t.datetime :event_at
      t.integer :notice_days
      t.text :action_reason
      t.string :action_by
      t.string :import_source
      t.string :import_key
    end

    add_index :sittings, :status
    add_index :sittings, :import_key, unique: true
    add_index :sittings, :business_type
  end
end
