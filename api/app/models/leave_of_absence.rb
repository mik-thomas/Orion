class LeaveOfAbsence < ApplicationRecord
  self.table_name = "leaves_of_absence"

  belongs_to :magistrate

  validates :starts_on, presence: true
  validate :ends_on_after_starts_on

  scope :active_on, lambda { |date|
    where("starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)", date, date)
  }
  scope :ordered, -> { order(starts_on: :desc) }

  def active?
    today = Date.current
    starts_on <= today && (ends_on.nil? || ends_on >= today)
  end

  private

  def ends_on_after_starts_on
    return if ends_on.blank? || starts_on.blank?
    return if ends_on >= starts_on

    errors.add(:ends_on, "must be on or after starts on")
  end
end
