# frozen_string_literal: true

module Orion
  # Username/password app login with revocable opaque session tokens.
  # Role comes from the authenticated User (not a client-spoofable header alone).
  module Auth
    module_function

    def authenticate(username, password)
      user = User.find_by(username: username.to_s.strip.downcase)
      return nil unless user&.authenticate(password.to_s)

      user
    end

    # Returns [raw_token, user_session]
    def issue_session!(user)
      raw_token = SecureRandom.urlsafe_base64(32)
      session = user.user_sessions.create!(
        token_digest: UserSession.digest(raw_token),
        expires_at: UserSession::TOKEN_TTL.from_now
      )
      [raw_token, session]
    end

    def find_user_for_token(raw_token)
      session = UserSession.find_by_raw_token(raw_token)
      return nil unless session

      session.user
    end

    def destroy_session!(raw_token)
      session = UserSession.find_by(token_digest: UserSession.digest(raw_token))
      session&.destroy!
    end
  end
end
