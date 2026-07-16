# frozen_string_literal: true

require "test_helper"

class MagistrateRoleSerializationTest < ActionDispatch::IntegrationTest
  test "deputy role anonymises magistrate names and email" do
    magistrate = magistrates(:alice)
    fake = Orion::PiiAnonymizer.for_magistrate(magistrate)

    get api_v1_magistrate_path(magistrate), headers: auth_headers(:deputy)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal fake["reference_code"], body["reference_code"]
    assert_equal fake["display_name"], body["display_name"]
    assert_equal false, body["name_visible"]
    assert_equal true, body["pii_anonymized"]
    assert_equal fake["full_name"], body["full_name"]
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
    assert_equal false, body["pii_anonymized"]
    assert_equal "SY-0001", body["reference_code"]
    assert_nil body["email"]
  end

  test "roster is forbidden for bench chair" do
    get roster_api_v1_magistrates_path, headers: auth_headers(:bench_chair)
    assert_response :forbidden
  end

  test "roster is forbidden for hmcts slm by default" do
    get roster_api_v1_magistrates_path, headers: auth_headers(:hmcts_slm)
    assert_response :forbidden
  end

  test "roster returns names for developer" do
    get roster_api_v1_magistrates_path, headers: auth_headers(:developer)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 2, body.length
    alice = body.find { |row| row["reference_code"] == "SY-0001" }
    assert_equal "Alice Example", alice["full_name"]
    assert_equal "alice@example.com", alice["email"]
  end

  test "hmcts slm anonymises names by default" do
    magistrate = magistrates(:alice)
    fake = Orion::PiiAnonymizer.for_magistrate(magistrate)

    get api_v1_magistrate_path(magistrate), headers: auth_headers(:hmcts_slm)
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal false, body["name_visible"]
    assert_equal fake["display_name"], body["display_name"]
  end

  test "role comes from authenticated user not spoofed header" do
    magistrate = magistrates(:alice)
    fake = Orion::PiiAnonymizer.for_magistrate(magistrate)

    get api_v1_magistrate_path(magistrate),
        headers: auth_headers(:bench_chair).merge("X-Orion-Role" => "Developer")
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal false, body["name_visible"]
    assert_equal fake["display_name"], body["display_name"]
  end

  test "developer may preview another role via header and hide PII" do
    magistrate = magistrates(:alice)
    fake = Orion::PiiAnonymizer.for_magistrate(magistrate)

    get api_v1_magistrate_path(magistrate),
        headers: auth_headers(:developer, role_override: "Deputy")
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal false, body["name_visible"]
    assert_equal fake["display_name"], body["display_name"]
  end

  test "ORION_SHOW_REAL_PII_ROLES can authorise additional roles" do
    previous = ENV["ORION_SHOW_REAL_PII_ROLES"]
    ENV["ORION_SHOW_REAL_PII_ROLES"] = "developer,hmcts_slm"
    begin
      get api_v1_magistrate_path(magistrates(:alice)), headers: auth_headers(:hmcts_slm)
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal true, body["name_visible"]
      assert_equal "Alice Example", body["display_name"]
    ensure
      if previous.nil?
        ENV.delete("ORION_SHOW_REAL_PII_ROLES")
      else
        ENV["ORION_SHOW_REAL_PII_ROLES"] = previous
      end
    end
  end
end
