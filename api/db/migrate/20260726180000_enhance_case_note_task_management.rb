# frozen_string_literal: true

class EnhanceCaseNoteTaskManagement < ActiveRecord::Migration[7.1]
  def up
    change_table :cases, bulk: true do |t|
      t.text :summary
      t.string :public_id
      t.bigint :created_by_id
      t.bigint :updated_by_id
      t.string :case_type
    end

    change_table :notes, bulk: true do |t|
      t.string :public_id
      t.bigint :created_by_id
      t.bigint :updated_by_id
      t.datetime :occurred_at
    end

    change_table :tasks, bulk: true do |t|
      t.string :public_id
      t.date :reminder_on
      t.bigint :case_id
      t.bigint :note_id
      t.bigint :updated_by_id
    end

    add_index :cases, :public_id, unique: true
    add_index :notes, :public_id, unique: true
    add_index :tasks, :public_id, unique: true
    add_index :tasks, :case_id
    add_index :tasks, :note_id
    add_index :tasks, :reminder_on

    add_foreign_key :cases, :users, column: :created_by_id
    add_foreign_key :cases, :users, column: :updated_by_id
    add_foreign_key :notes, :users, column: :created_by_id
    add_foreign_key :notes, :users, column: :updated_by_id
    add_foreign_key :tasks, :cases, column: :case_id
    add_foreign_key :tasks, :notes, column: :note_id
    add_foreign_key :tasks, :users, column: :updated_by_id

    execute <<~SQL.squish
      UPDATE cases SET public_id = 'CA-' || LPAD(id::text, 6, '0') WHERE public_id IS NULL
    SQL
    execute <<~SQL.squish
      UPDATE notes SET public_id = 'NT-' || LPAD(id::text, 7, '0') WHERE public_id IS NULL
    SQL
    execute <<~SQL.squish
      UPDATE notes SET occurred_at = created_at WHERE occurred_at IS NULL
    SQL
    execute <<~SQL.squish
      UPDATE tasks SET public_id = 'TK-' || LPAD(id::text, 6, '0') WHERE public_id IS NULL
    SQL

    execute <<~SQL.squish
      UPDATE tasks SET status = 'open' WHERE status = 'in_progress'
    SQL
    execute <<~SQL.squish
      UPDATE tasks SET status = 'closed' WHERE status IN ('done', 'cancelled')
    SQL
  end

  def down
    remove_foreign_key :tasks, column: :updated_by_id
    remove_foreign_key :tasks, column: :note_id
    remove_foreign_key :tasks, column: :case_id
    remove_foreign_key :notes, column: :updated_by_id
    remove_foreign_key :notes, column: :created_by_id
    remove_foreign_key :cases, column: :updated_by_id
    remove_foreign_key :cases, column: :created_by_id

    remove_index :tasks, :reminder_on
    remove_index :tasks, :note_id
    remove_index :tasks, :case_id
    remove_index :tasks, :public_id
    remove_index :notes, :public_id
    remove_index :cases, :public_id

    change_table :tasks, bulk: true do |t|
      t.remove :public_id, :reminder_on, :case_id, :note_id, :updated_by_id
    end

    change_table :notes, bulk: true do |t|
      t.remove :public_id, :created_by_id, :updated_by_id, :occurred_at
    end

    change_table :cases, bulk: true do |t|
      t.remove :summary, :public_id, :created_by_id, :updated_by_id, :case_type
    end

    execute <<~SQL.squish
      UPDATE tasks SET status = 'done' WHERE status = 'closed' AND completed_at IS NOT NULL
    SQL
  end
end
