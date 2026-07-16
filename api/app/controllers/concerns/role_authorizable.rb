# frozen_string_literal: true

# Authenticates API requests via X-Orion-Session and derives role from the user.
# Real PII is gated by ORION_SHOW_REAL_PII_ROLES (default: developer only).
# Visibility requires the authenticated account role AND the effective viewing role
# to be allowlisted — client headers alone cannot elevate to real names.
# Developer accounts may send X-Orion-Role to preview as a more restricted role.
# In development only, ORION_ALLOW_ROLE_HEADER=1 allows unauthenticated role
# header fallback (documented in docs/login.md) — never used in production.
module RoleAuthorizable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_request!
    before_action :set_current_role
  end

  def current_user
    @current_user
  end

  def current_role
    @current_role
  end

  # Real identifiable magistrate data (names, emails, real reference codes).
  def real_pii?
    return false unless @current_user

    Orion::Role.real_pii?(@current_user.role_label) &&
      Orion::Role.real_pii?(@current_role)
  end

  def names_visible?
    real_pii?
  end

  # Roster includes emails — same gate as real PII.
  def roster_access?
    real_pii?
  end

  private

  def authenticate_request!
    token = session_token
    @current_user = Orion::Auth.find_user_for_token(token) if token.present?
    return if @current_user

    if allow_dev_role_header_fallback?
      @current_user = nil
      return
    end

    render json: { error: "Sign in required" }, status: :unauthorized
  end

  def set_current_role
    header_role = request.headers["X-Orion-Role"]

    if @current_user
      @current_role =
        if @current_user.developer? && header_role.present?
          Orion::Role.parse(header_role)
        else
          @current_user.role_label
        end
      return
    end

    # Dev-only unauthenticated fallback (see allow_dev_role_header_fallback?).
    @current_role = Orion::Role.parse(header_role)
  end

  def require_roster_access!
    return if roster_access?

    render json: {
      error: "Roster access requires a role authorised for real identifiable data"
    }, status: :forbidden
  end

  def session_token
    request.headers["X-Orion-Session"].presence || params[:token]
  end

  def allow_dev_role_header_fallback?
    !Rails.env.production? && ActiveModel::Type::Boolean.new.cast(ENV["ORION_ALLOW_ROLE_HEADER"])
  end
end
