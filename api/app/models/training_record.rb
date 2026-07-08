class TrainingRecord < ApplicationRecord
  belongs_to :magistrate

  validates :session_date, presence: true
  validates :days, numericality: { greater_than: 0, less_than_or_equal_to: 2 }
end
