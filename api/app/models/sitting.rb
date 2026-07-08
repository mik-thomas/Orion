class Sitting < ApplicationRecord
  belongs_to :magistrate
  belongs_to :courthouse
  belongs_to :sitting_type

  STATUSES = %w[completed vacated cancelled].freeze
  COURT_TYPES = Orion::Domain::COURT_TYPES
  SITTING_POSITIONS = Orion::Domain::SITTING_POSITIONS

  validates :session_date, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :court_type, inclusion: { in: COURT_TYPES }, allow_nil: true
  validates :sitting_position, inclusion: { in: SITTING_POSITIONS }, allow_nil: true

  scope :vacated, -> { where(status: "vacated") }
  scope :cancelled, -> { where(status: "cancelled") }
  scope :completed, -> { where(status: "completed") }
  scope :on_date, ->(date) { where(session_date: date) }
  scope :ordered, -> { order(session_date: :desc, session: :desc) }
end
