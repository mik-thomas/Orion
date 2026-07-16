# frozen_string_literal: true

require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  test "bench chair can sign in with demo credentials" do
    post api_v1_session_path, params: {
      username: "bench.chair",
      password: "BenchChair-Demo-2026"
    }, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "bench.chair", body["username"]
    assert_equal "Bench Chair", body["role"]
    assert body["token"].present?
  end

  test "rejects invalid credentials" do
    post api_v1_session_path, params: {
      username: "bench.chair",
      password: "wrong"
    }, as: :json

    assert_response :unauthorized
  end

  test "show returns session for valid token" do
    post api_v1_session_path, params: {
      username: "bench.chair",
      password: "BenchChair-Demo-2026"
    }, as: :json
    token = JSON.parse(response.body)["token"]

    get api_v1_session_path, headers: { "X-Orion-Session" => token }
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "bench.chair", body["username"]
    assert_equal "Bench Chair", body["role"]
  end

  test "show rejects missing token" do
    get api_v1_session_path
    assert_response :unauthorized
  end
end
