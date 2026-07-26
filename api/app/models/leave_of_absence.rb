class LeaveOfAbsence < ApplicationRecord
  self.table_name = "leaves_of_absence"

  belongs_to :magistrate

  validates :starts_on, presence: true
  validate :ends_on_after_starts_on
  validate :ends_on_extension_rules, if: :will_save_change_to_ends_on?
  validate :next_review_on_on_or_after_starts_on
  validate :returned_on_on_or_after_starts_on

  scope :active_on, lambda { |date|
    where("starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)", date, date)
  }
  scope :ended_without_return_on, lambda { |date|
    where("ends_on IS NOT NULL AND ends_on < ? AND returned_on IS NULL", date)
  }
  scope :ordered, -> { order(starts_on: :desc) }

  def active?
    today = Date.current
    starts_on <= today && (ends_on.nil? || ends_on >= today)
  end

  def expired_without_return?(as_of: Date.current)
    ends_on.present? && ends_on < as_of && returned_on.blank?
  end

  private

  def ends_on_after_starts_on
    return if ends_on.blank? || starts_on.blank?
    return if ends_on >= starts_on

    errors.add(:ends_on, "must be on or after starts on")
  end

  # Extending LOA end dates: new ends_on must be later than the current end
  # (or on/after starts_on when open-ended). Returned leaves cannot be extended.
  def ends_on_extension_rules
    return if new_record?
    return if ends_on.blank?

    if returned_on.present?
      errors.add(:ends_on, "cannot be changed after return from leave has been recorded")
      return
    end

    previous_ends_on = ends_on_in_database
    return if previous_ends_on.blank?
    return if ends_on > previous_ends_on

    errors.add(:ends_on, "must be after current end date")
  end

  def next_review_on_on_or_after_starts_on
    return if next_review_on.blank? || starts_on.blank?
    return if next_review_on >= starts_on

    errors.add(:next_review_on, "must be on or after starts on")
  end

  def returned_on_on_or_after_starts_on
    return if returned_on.blank? || starts_on.blank?
    return if returned_on >= starts_on

    errors.add(:returned_on, "must be on or after starts on")
  end
end

