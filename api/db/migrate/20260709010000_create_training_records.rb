class CreateTrainingRecords < ActiveRecord::Migration[7.1]
  def change
    create_table :training_records do |t|
      t.references :magistrate, null: false, foreign_key: true
      t.date :session_date, null: false
      t.decimal :days, precision: 3, scale: 1, null: false, default: 1.0
      t.string :description

      t.timestamps
    end

    add_index :training_records, %i[magistrate_id session_date]
  end
end
