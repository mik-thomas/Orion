# frozen_string_literal: true

class CreateUsersAndUserSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :username, null: false
      t.string :email
      t.string :password_digest, null: false
      t.string :role, null: false, default: "deputy"
      t.string :display_name, null: false
      t.timestamps
    end
    add_index :users, :username, unique: true
    add_index :users, :email, unique: true, where: "email IS NOT NULL"

    create_table :user_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.timestamps
    end
    add_index :user_sessions, :token_digest, unique: true
    add_index :user_sessions, :expires_at
  end
end
