# frozen_string_literal: true

class Task < ApplicationRecord
  include HasPublicId

  formats_public_id prefix: "TK", width: 6

  STATUSES = %w[open closed].freeze
  PRIORITIES = %w[low normal high].freeze

  belongs_to :created_by, class_name: "User"
  belongs_to :assigned_to, class_name: "User"
  belongs_to :updated_by, class_name: "User", optional: true
  belongs_to :case, optional: true
  belongs_to :note, optional: true

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :priority, inclusion: { in: PRIORITIES }

  before_save :sync_completed_at

  scope :ordered, lambda {
    order(
      Arel.sql("CASE status WHEN 'open' THEN 0 ELSE 1 END"),
      due_on: :asc,
      created_at: :desc
    )
  }
  scope :open_tasks, -> { where(status: "open").order(Arel.sql("due_on ASC NULLS LAST"), created_at: :desc) }
  scope :with_status, ->(status) { where(status: status) if status.present? }
  scope :assigned_to_user, ->(user_id) { where(assigned_to_id: user_id) if user_id.present? }
  scope :overdue, lambda {
    where(status: "open")
      .where.not(due_on: nil)
      .where("due_on < ?", Date.current)
  }
  scope :completed_between, lambda { |from_date, to_date|
    scope = where(status: "closed")
    scope = scope.where("completed_at >= ?", from_date.beginning_of_day) if from_date
    scope = scope.where("completed_at <= ?", to_date.end_of_day) if to_date
    scope
  }

  def overdue?
    due_on.present? && status == "open" && due_on < Date.current
  end

  def linked_magistrate
    self.case&.magistrate || note&.case&.magistrate
  end

  private

  def sync_completed_at
    if status == "closed"
      self.completed_at ||= Time.current
    elsif status_changed? && status_was == "closed"
      self.completed_at = nil
    end
  end
end
