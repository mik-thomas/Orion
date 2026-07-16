# frozen_string_literal: true

require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  test "bench chair can create a task delegated to deputy" do
    deputy = users(:deputy)

    assert_difference("Task.count", 1) do
      post api_v1_tasks_path, params: {
        task: {
          title: "Prepare sitting forecast pack",
          description: "Draft for next Bench Chair meeting",
          priority: "high",
          due_on: Date.current + 5,
          assigned_to_user_id: deputy.id
        }
      }, headers: auth_headers(:bench_chair), as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Prepare sitting forecast pack", body["title"]
    assert_equal "open", body["status"]
    assert_equal deputy.id, body["assigned_to_user_id"]
    assert_equal users(:bench_chair).id, body["created_by_user_id"]
    assert_equal "Deputy", body["assigned_to"]["role"]
  end

  test "deputy cannot create tasks" do
    post api_v1_tasks_path, params: {
      task: { title: "Should fail", assigned_to_user_id: users(:deputy).id }
    }, headers: auth_headers(:deputy), as: :json

    assert_response :forbidden
  end

  test "deputy only sees assigned tasks" do
    get api_v1_tasks_path, headers: auth_headers(:deputy)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["tasks"].all? { |task| task["assigned_to_user_id"] == users(:deputy).id }
    assert_includes body["summary"].keys, "open"
  end

  test "bench chair lists all tasks with summary" do
    get api_v1_tasks_path, headers: auth_headers(:bench_chair)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["tasks"].size >= 3
    assert body["summary"]["total"] >= 3
  end

  test "deputy can update status and report notes" do
    task = tasks(:rota_coverage)

    patch api_v1_task_path(task), params: {
      task: { status: "in_progress", report_notes: "Spoke to listing office." }
    }, headers: auth_headers(:deputy), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "in_progress", body["status"]
    assert_equal "Spoke to listing office.", body["report_notes"]
  end

  test "deputy cannot change title or assignee" do
    task = tasks(:rota_coverage)

    patch api_v1_task_path(task), params: {
      task: { title: "Hacked title", status: "done" }
    }, headers: auth_headers(:deputy), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Confirm next month's rota coverage", body["title"]
    assert_equal "done", body["status"]
    assert body["completed_at"].present?
  end

  test "developer has full access including cancel" do
    task = tasks(:appraisal_followup)

    delete api_v1_task_path(task), headers: auth_headers(:developer)
    assert_response :success
    assert_equal "cancelled", JSON.parse(response.body)["status"]
  end

  test "summary endpoint returns counts" do
    get summary_api_v1_tasks_path, headers: auth_headers(:bench_chair)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["open"] >= 1
    assert body["done"] >= 1
  end

  test "filters by status" do
    get api_v1_tasks_path, params: { status: "done" }, headers: auth_headers(:bench_chair)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["tasks"].all? { |task| task["status"] == "done" }
  end

  test "unauthenticated requests are rejected" do
    get api_v1_tasks_path
    assert_response :unauthorized
  end
end
