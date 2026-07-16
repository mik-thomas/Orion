# frozen_string_literal: true

class User < ApplicationRecord
  has_secure_password

  has_many :user_sessions, dependent: :destroy
  has_many :created_tasks, class_name: "Task", foreign_key: :created_by_id, dependent: :restrict_with_exception, inverse_of: :created_by
  has_many :assigned_tasks, class_name: "Task", foreign_key: :assigned_to_id, dependent: :restrict_with_exception, inverse_of: :assigned_to

  ROLES = %w[deputy bench_chair hmcts_slm developer].freeze

  validates :username, presence: true, uniqueness: { case_sensitive: false }
  validates :email, uniqueness: { case_sensitive: false, allow_nil: true }
  validates :role, presence: true, inclusion: { in: ROLES }
  validates :display_name, presence: true
  validates :password, length: { minimum: 8 }, if: -> { password.present? }

  before_validation :normalize_username_email

  def role_label
    Orion::Role.label_for(role)
  end

  def developer?
    role == "developer"
  end

  def bench_chair?
    role == "bench_chair"
  end

  def deputy?
    role == "deputy"
  end

  def can_manage_tasks?
    developer? || bench_chair?
  end

  def can_report_on_tasks?
    developer? || deputy? || bench_chair?
  end

  def manager?
    Orion::Role.real_pii?(role_label)
  end

  def real_pii?
    Orion::Role.real_pii?(role_label)
  end

  private

  def normalize_username_email
    self.username = username.to_s.strip.downcase.presence
    self.email = email.to_s.strip.downcase.presence
  end
end
