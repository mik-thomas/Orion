# frozen_string_literal: true

class AddContactNumberToMagistrates < ActiveRecord::Migration[7.1]
  def change
    add_column :magistrates, :contact_number, :string
  end
end
