# frozen_string_literal: true

require "test_helper"

class MagistrateRetiringSoonTest < ActionDispatch::IntegrationTest
  test "retiring_soon returns magistrates with retirement within six months" do
    magistrates(:alice).update!(retirement_on: Date.current + 45.days)
    magistrates(:bob).update!(retirement_on: Date.current + 8.months)

    get retiring_soon_api_v1_magistrates_path, headers: auth_headers(:developer)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 1, body.length
    assert_equal magistrates(:alice).id, body.first["magistrate_id"]
    assert_equal "Alice Example", body.first["display_name"]
    assert_equal 45, body.first["days_until_retirement"]
    assert_equal true, body.first["imminent"]
  end

  test "retiring_soon hides names for deputy role" do
    magistrates(:alice).update!(retirement_on: Date.current + 30.days)

    get retiring_soon_api_v1_magistrates_path, headers: auth_headers(:deputy)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "SY-0001", body.first["display_name"]
  end

  test "reports overview includes retiring_soon" do
    magistrates(:alice).update!(retirement_on: Date.current + 60.days)

    get api_v1_reports_overview_path, headers: auth_headers(:developer)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 1, body["retiring_soon"].length
    assert_equal magistrates(:alice).id, body["retiring_soon"].first["magistrate_id"]
  end

  test "magistrate detail exposes retirement_on" do
    magistrates(:alice).update!(retirement_on: Date.current + 90.days)

    get api_v1_magistrate_path(magistrates(:alice)), headers: auth_headers(:developer)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal (Date.current + 90.days).iso8601, body["retirement_on"]
  end
end
