# frozen_string_literal: true

require "openssl"

module Orion
  # MVP demo users for Bench Chair (and optional other roles) until SSO lands.
  # Override with ORION_DEMO_USERS JSON: [{"username":"...","password":"...","role":"Bench Chair","display_name":"..."}]
  module DemoAuth
    DEFAULT_USERS = [
      {
        "username" => "bench.chair",
        "password" => "BenchChair-Demo-2026",
        "role" => "Bench Chair",
        "display_name" => "Bench Chair"
      }
    ].freeze

    TOKEN_TTL = 30.days

    module_function

    def users
      raw = ENV["ORION_DEMO_USERS"].to_s.strip
      return DEFAULT_USERS if raw.blank?

      parsed = JSON.parse(raw)
      return DEFAULT_USERS unless parsed.is_a?(Array) && parsed.any?

      parsed.map { |row| stringify_keys(row) }
    rescue JSON::ParserError
      DEFAULT_USERS
    end

    def authenticate(username, password)
      user = users.find { |row| row["username"].to_s.casecmp?(username.to_s.strip) }
      return nil unless user

      stored = user["password"].to_s
      provided = password.to_s
      return nil if stored.blank? || provided.blank?
      return nil unless ActiveSupport::SecurityUtils.secure_compare(stored, provided)

      user
    end

    def issue_token(user)
      payload = {
        "u" => user["username"],
        "r" => user["role"],
        "exp" => TOKEN_TTL.from_now.to_i
      }
      data = Base64.urlsafe_encode64(payload.to_json, padding: false)
      "#{data}.#{sign(data)}"
    end

    def verify_token(token)
      data, sig = token.to_s.split(".", 2)
      return nil if data.blank? || sig.blank?
      return nil unless ActiveSupport::SecurityUtils.secure_compare(sign(data), sig)

      payload = JSON.parse(Base64.urlsafe_decode64(data))
      return nil if payload["exp"].to_i < Time.current.to_i
      return nil if payload["u"].blank? || payload["r"].blank?

      payload
    rescue ArgumentError, JSON::ParserError
      nil
    end

    def secret
      ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base
    end

    def sign(data)
      OpenSSL::HMAC.hexdigest("SHA256", secret, data)
    end

    def stringify_keys(row)
      row.to_h.transform_keys(&:to_s)
    end
    private_class_method :sign, :stringify_keys
  end
end
