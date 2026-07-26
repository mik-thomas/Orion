class AddReturnedOnToLeavesOfAbsence < ActiveRecord::Migration[7.1]
  def change
    add_column :leaves_of_absence, :returned_on, :date
  end
end
