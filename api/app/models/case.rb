# frozen_string_literal: true

class Case < ApplicationRecord
  include HasPublicId

  formats_public_id prefix: "CA", width: 6

  STATUSES = %w[open closed].freeze

  belongs_to :magistrate
  belongs_to :created_by, class_name: "User", optional: true
  belongs_to :updated_by, class_name: "User", optional: true

  has_many :notes, dependent: :destroy
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }

  scope :ordered, -> { order(updated_at: :desc) }
  scope :chronological, -> { order(created_at: :asc) }
  scope :search, lambda { |query|
    q = query.to_s.strip
    next all if q.blank?

    pattern = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
    where(
      "cases.public_id ILIKE :q OR cases.title ILIKE :q OR cases.summary ILIKE :q OR cases.reference ILIKE :q",
      q: pattern
    )
  }
end
