class AddNextReviewOnToLeavesOfAbsence < ActiveRecord::Migration[7.1]
  def change
    add_column :leaves_of_absence, :next_review_on, :date
  end
end
