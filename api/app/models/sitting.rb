class Sitting < ApplicationRecord
  belongs_to :magistrate
  belongs_to :courthouse
  belongs_to :sitting_type

  validates :session_date, presence: true

  scope :vacated, -> { where(vacated: true) }
  scope :completed, -> { where(vacated: false) }
  scope :on_date, ->(date) { where(session_date: date) }
  scope :ordered, -> { order(session_date: :desc, starts_at: :desc) }
end
