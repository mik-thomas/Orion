# frozen_string_literal: true

class AddRaFieldsToMagistrates < ActiveRecord::Migration[7.1]
  def change
    add_column :magistrates, :ra_in_place, :boolean, default: false, null: false
    add_column :magistrates, :ra_passport_in_place, :boolean, default: false, null: false
    add_column :magistrates, :ra_application_made, :boolean, default: false, null: false
    add_column :magistrates, :ra_application_made_on, :date
    add_column :magistrates, :ra_approved, :boolean, default: false, null: false
  end
end
