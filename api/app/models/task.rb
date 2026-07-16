# frozen_string_literal: true

class Task < ApplicationRecord
  STATUSES = %w[open in_progress done cancelled].freeze
  PRIORITIES = %w[low normal high].freeze

  belongs_to :created_by, class_name: "User"
  belongs_to :assigned_to, class_name: "User"

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :priority, inclusion: { in: PRIORITIES }

  before_save :sync_completed_at

  scope :ordered, -> { order(Arel.sql("CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'done' THEN 2 ELSE 3 END"), due_on: :asc, created_at: :desc) }
  scope :with_status, ->(status) { where(status: status) if status.present? }
  scope :assigned_to_user, ->(user_id) { where(assigned_to_id: user_id) if user_id.present? }
  scope :overdue, lambda {
    where(status: %w[open in_progress])
      .where.not(due_on: nil)
      .where("due_on < ?", Date.current)
  }
  scope :completed_between, lambda { |from_date, to_date|
    scope = where(status: "done")
    scope = scope.where("completed_at >= ?", from_date.beginning_of_day) if from_date
    scope = scope.where("completed_at <= ?", to_date.end_of_day) if to_date
    scope
  }

  def overdue?
    due_on.present? && %w[open in_progress].include?(status) && due_on < Date.current
  end

  private

  def sync_completed_at
    if status == "done"
      self.completed_at ||= Time.current
    elsif status_changed? && status_was == "done"
      self.completed_at = nil
    end
  end
end
