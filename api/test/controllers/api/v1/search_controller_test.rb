# frozen_string_literal: true

require "test_helper"

class SearchControllerTest < ActionDispatch::IntegrationTest
  test "search returns typed magistrate case and note results" do
    get api_v1_search_path, params: { q: "Appraisal" }, headers: auth_headers(:developer)
    assert_response :success
    body = JSON.parse(response.body)
    types = body["results"].map { |row| row["type"] }.uniq
    assert_includes types, "case"
    assert_includes types, "note"

    case_row = body["results"].find { |row| row["type"] == "case" }
    assert_equal "CA-000001", case_row["public_id"]
    assert_equal "/cases/CA-000001", case_row["path_hint"]
  end

  test "blank query returns empty results" do
    get api_v1_search_path, params: { q: " " }, headers: auth_headers(:developer)
    assert_response :success
    assert_equal [], JSON.parse(response.body)["results"]
  end
end
