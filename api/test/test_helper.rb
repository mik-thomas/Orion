ENV["RAILS_ENV"] ||= "test"
# Controller tests assert role visibility via X-Orion-Role without a session.
# Production never sets this; see RoleAuthorizable#allow_dev_role_header_fallback?
ENV["ORION_ALLOW_ROLE_HEADER"] ||= "1"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all
    set_fixture_class leaves_of_absence: LeaveOfAbsence

    # Returns headers for an authenticated request as the given user fixture.
    # Developer accounts may pass role_override to preview another role.
    def auth_headers(user_key = :developer, role_override: nil)
      user = users(user_key)
      raw_token, = Orion::Auth.issue_session!(user)
      headers = { "X-Orion-Session" => raw_token }
      headers["X-Orion-Role"] = role_override if role_override
      headers
    end
  end
end
