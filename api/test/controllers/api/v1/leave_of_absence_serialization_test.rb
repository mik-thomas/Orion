# frozen_string_literal: true

require "test_helper"

class LeaveOfAbsenceSerializationTest < ActionDispatch::IntegrationTest
  test "leave json exposes next_loa_review_on" do
    leave = leaves_of_absence(:alice_active)

    get api_v1_magistrate_leaves_of_absence_index_path(magistrates(:alice))
    assert_response :success

    body = JSON.parse(response.body)
    row = body.find { |item| item["id"] == leave.id }
    assert_equal "2026-06-01", row["next_loa_review_on"]
    assert_equal true, row["active"]
  end

  test "on leave list includes next_loa_review_on" do
    get on_leave_api_v1_magistrates_path, headers: { "X-Orion-Role" => "Developer" }
    assert_response :success

    body = JSON.parse(response.body)
    bob = body.find { |row| row["reference_code"] == "SY-0002" }
    assert bob
    assert_equal "2025-12-01", bob["current_leaves"].first["next_loa_review_on"]
  end

  test "active leave without review date raises warning violation" do
    magistrate = magistrates(:alice)
    leaves_of_absence(:alice_active).update!(next_review_on: nil)

    get api_v1_magistrate_path(magistrate), headers: { "X-Orion-Role" => "Developer" }
    assert_response :success

    body = JSON.parse(response.body)
    codes = body["violations"].map { |violation| violation["code"] }
    assert_includes codes, "loa_review_missing"
    assert_equal "yellow", body["violations"].find { |v| v["code"] == "loa_review_missing" }["severity"]
  end

  test "overdue loa review raises violation" do
    magistrate = magistrates(:bob)

    get api_v1_magistrate_path(magistrate), headers: { "X-Orion-Role" => "Developer" }
    assert_response :success

    body = JSON.parse(response.body)
    codes = body["violations"].map { |violation| violation["code"] }
    assert_includes codes, "loa_review_overdue"
    assert_equal "red", body["violations"].find { |v| v["code"] == "loa_review_overdue" }["severity"]
  end

  test "can update next_review_on via leave endpoint" do
    leave = leaves_of_absence(:alice_active)

    patch api_v1_magistrate_leaves_of_absence_path(magistrates(:alice), leave),
          params: { leave_of_absence: { next_review_on: "2026-08-15" } },
          as: :json
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "2026-08-15", body["next_loa_review_on"]
  end
end
