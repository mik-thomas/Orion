# frozen_string_literal: true

class UserSession < ApplicationRecord
  belongs_to :user

  TOKEN_TTL = 30.days

  scope :active, -> { where("expires_at > ?", Time.current) }

  def expired?
    expires_at <= Time.current
  end

  def self.digest(raw_token)
    Digest::SHA256.hexdigest(raw_token.to_s)
  end

  def self.find_by_raw_token(raw_token)
    return nil if raw_token.blank?

    active.find_by(token_digest: digest(raw_token))
  end
end
