# frozen_string_literal: true

# MVP role selection via X-Orion-Role request header (no SSO yet).
# Production should replace this with proper authentication and authorization.
module RoleAuthorizable
  extend ActiveSupport::Concern

  included do
    before_action :set_current_role
  end

  def current_role
    @current_role
  end

  def names_visible?
    Orion::Role.names_visible?(@current_role)
  end

  def roster_access?
    Orion::Role.roster_access?(@current_role)
  end

  private

  def set_current_role
    @current_role = Orion::Role.parse(request.headers["X-Orion-Role"])
  end

  def require_roster_access!
    return if roster_access?

    render json: { error: "Roster access requires HMCTS-SLM or Developer role" }, status: :forbidden
  end
end
