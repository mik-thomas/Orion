# frozen_string_literal: true

class CreateTasks < ActiveRecord::Migration[7.1]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.text :description
      t.string :status, null: false, default: "open"
      t.string :priority, null: false, default: "normal"
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.references :assigned_to, null: false, foreign_key: { to_table: :users }
      t.date :due_on
      t.datetime :completed_at
      t.text :report_notes

      t.timestamps
    end

    add_index :tasks, :status
    add_index :tasks, :due_on
    add_index :tasks, :completed_at
  end
end
