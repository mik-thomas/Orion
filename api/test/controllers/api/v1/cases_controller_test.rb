# frozen_string_literal: true

require "test_helper"

class CasesControllerTest < ActionDispatch::IntegrationTest
  test "creates a case with public_id and audit users" do
    magistrate = magistrates(:alice)

    assert_difference("Case.count", 1) do
      post api_v1_magistrate_cases_path(magistrate), params: {
        case: {
          title: "New welfare note case",
          summary: "Track welfare check-ins",
          status: "open",
          case_type: "welfare"
        }
      }, headers: auth_headers(:developer), as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_match(/\ACA-\d+\z/, body["public_id"])
    assert_equal "Track welfare check-ins", body["summary"]
    assert_equal users(:developer).id, body["created_by"]["id"]
    assert_equal magistrate.id, body["magistrate_id"]
  end

  test "show finds case by public_id" do
    kase = cases(:appraisal)

    get api_v1_case_path(kase.public_id), headers: auth_headers(:developer)
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "CA-000001", body["public_id"]
    assert body["notes"].is_a?(Array)
    assert body["timeline"].is_a?(Array)
  end
end
