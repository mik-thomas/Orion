# frozen_string_literal: true

class User < ApplicationRecord
  has_secure_password

  has_many :user_sessions, dependent: :destroy

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
