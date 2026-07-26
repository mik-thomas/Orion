# frozen_string_literal: true

class Note < ApplicationRecord
  include HasPublicId

  formats_public_id prefix: "NT", width: 7

  belongs_to :case
  belongs_to :created_by, class_name: "User", optional: true
  belongs_to :updated_by, class_name: "User", optional: true

  has_many :tasks, dependent: :nullify

  validates :body, presence: true

  before_validation :default_occurred_at, on: :create

  scope :chronological, -> { order(Arel.sql("COALESCE(occurred_at, created_at) ASC"), :id) }
  scope :search, lambda { |query|
    q = query.to_s.strip
    next all if q.blank?

    pattern = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
    where("notes.public_id ILIKE :q OR notes.body ILIKE :q", q: pattern)
  }

  private

  def default_occurred_at
    self.occurred_at ||= Time.current
  end
end
