# frozen_string_literal: true

require "test_helper"

class MagistrateRoleSerializationTest < ActionDispatch::IntegrationTest
  test "deputy role hides magistrate names and email" do
    magistrate = magistrates(:alice)

    get api_v1_magistrate_path(magistrate), headers: auth_headers(:deputy)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "SY-0001", body["reference_code"]
    assert_equal "SY-0001", body["display_name"]
    assert_equal false, body["name_visible"]
    assert_nil body["full_name"]
    assert_nil body["first_name"]
    assert_nil body["last_name"]
    assert_nil body["email"]
  end

  test "developer role shows full names and reference code" do
    magistrate = magistrates(:alice)

    get api_v1_magistrate_path(magistrate), headers: auth_headers(:developer)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "Alice Example", body["display_name"]
    assert_equal "Alice Example", body["full_name"]
    assert_equal true, body["name_visible"]
    assert_equal "SY-0001", body["reference_code"]
    assert_nil body["email"]
  end

  test "roster is forbidden for bench chair" do
    get roster_api_v1_magistrates_path, headers: auth_headers(:bench_chair)
    assert_response :forbidden
  end

  test "roster returns names for hmcts slm" do
    get roster_api_v1_magistrates_path, headers: auth_headers(:hmcts_slm)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 2, body.length
    alice = body.find { |row| row["reference_code"] == "SY-0001" }
    assert_equal "Alice Example", alice["full_name"]
    assert_equal "alice@example.com", alice["email"]
  end

  test "role comes from authenticated user not spoofed header" do
    # Bench Chair session with spoofed Developer header must stay restricted.
    get api_v1_magistrate_path(magistrates(:alice)),
        headers: auth_headers(:bench_chair).merge("X-Orion-Role" => "Developer")
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal false, body["name_visible"]
    assert_equal "SY-0001", body["display_name"]
  end

  test "developer may preview another role via header" do
    get api_v1_magistrate_path(magistrates(:alice)),
        headers: auth_headers(:developer, role_override: "Deputy")
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal false, body["name_visible"]
    assert_equal "SY-0001", body["display_name"]
  end
end
