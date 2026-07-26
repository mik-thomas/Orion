# frozen_string_literal: true

class AddMagistrateIdToTasks < ActiveRecord::Migration[7.1]
  def change
    add_reference :tasks, :magistrate, foreign_key: true, null: true
  end
end
