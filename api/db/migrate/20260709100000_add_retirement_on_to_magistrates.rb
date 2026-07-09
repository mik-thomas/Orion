# frozen_string_literal: true

class AddRetirementOnToMagistrates < ActiveRecord::Migration[7.1]
  def change
    add_column :magistrates, :retirement_on, :date
    add_index :magistrates, :retirement_on
  end
end
