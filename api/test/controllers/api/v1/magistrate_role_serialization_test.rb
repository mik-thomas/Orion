# frozen_string_literal: true

require "test_helper"

class MagistrateRoleSerializationTest < ActionDispatch::IntegrationTest
  test "deputy role hides magistrate names and email" do
    magistrate = magistrates(:alice)

    get api_v1_magistrate_path(magistrate), headers: { "X-Orion-Role" => "Deputy" }
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

    get api_v1_magistrate_path(magistrate), headers: { "X-Orion-Role" => "Developer" }
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal "Alice Example", body["display_name"]
    assert_equal "Alice Example", body["full_name"]
    assert_equal true, body["name_visible"]
    assert_equal "SY-0001", body["reference_code"]
    assert_nil body["email"]
  end

  test "roster is forbidden for bench chair" do
    get roster_api_v1_magistrates_path, headers: { "X-Orion-Role" => "Bench Chair" }
    assert_response :forbidden
  end

  test "roster returns names for hmcts slm" do
    get roster_api_v1_magistrates_path, headers: { "X-Orion-Role" => "HMCTS-SLM" }
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 2, body.length
    alice = body.find { |row| row["reference_code"] == "SY-0001" }
    assert_equal "Alice Example", alice["full_name"]
    assert_equal "alice@example.com", alice["email"]
  end

  test "defaults to deputy when role header missing" do
    get api_v1_magistrate_path(magistrates(:alice))
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal false, body["name_visible"]
    assert_equal "SY-0001", body["display_name"]
  end
end
