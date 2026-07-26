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
    assert_match(/\ATK-\d+\z/, body["public_id"])
    assert_equal deputy.id, body["assigned_to_user_id"]
    assert_equal users(:bench_chair).id, body["created_by_user_id"]
    assert_equal "Deputy", body["assigned_to"]["role"]
  end

  test "deputy can create a personal task assigned to self" do
    deputy = users(:deputy)

    assert_difference("Task.count", 1) do
      post api_v1_tasks_path, params: {
        task: {
          title: "Personal follow-up",
          assigned_to_user_id: deputy.id
        }
      }, headers: auth_headers(:deputy), as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal deputy.id, body["assigned_to_user_id"]
  end

  test "deputy cannot assign a new task to another user" do
    post api_v1_tasks_path, params: {
      task: { title: "Should fail", assigned_to_user_id: users(:bench_chair).id }
    }, headers: auth_headers(:deputy), as: :json

    assert_response :forbidden
  end

  test "deputy only sees assigned tasks" do
    get api_v1_tasks_path, headers: auth_headers(:deputy)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["tasks"].all? { |task| task["assigned_to_user_id"] == users(:deputy).id }
    assert_includes body["summary"].keys, "open"
    assert_includes body["summary"].keys, "closed"
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
      task: { status: "closed", report_notes: "Spoke to listing office." }
    }, headers: auth_headers(:deputy), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "closed", body["status"]
    assert_equal "Spoke to listing office.", body["report_notes"]
    assert body["completed_at"].present?
  end

  test "deputy cannot change title or assignee" do
    task = tasks(:rota_coverage)

    patch api_v1_task_path(task), params: {
      task: { title: "Hacked title", status: "closed" }
    }, headers: auth_headers(:deputy), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Confirm next month's rota coverage", body["title"]
    assert_equal "closed", body["status"]
    assert body["completed_at"].present?
  end

  test "developer can close a task via destroy" do
    task = tasks(:appraisal_followup)

    delete api_v1_task_path(task), headers: auth_headers(:developer)
    assert_response :success
    assert_equal "closed", JSON.parse(response.body)["status"]
  end

  test "summary endpoint returns counts" do
    get summary_api_v1_tasks_path, headers: auth_headers(:bench_chair)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["open"] >= 1
    assert body["closed"] >= 1
  end

  test "filters by status" do
    get api_v1_tasks_path, params: { status: "closed" }, headers: auth_headers(:bench_chair)
    assert_response :success
    body = JSON.parse(response.body)
    assert body["tasks"].all? { |task| task["status"] == "closed" }
  end

  test "can link task to a case" do
    kase = cases(:appraisal)

    patch api_v1_task_path(tasks(:rota_coverage)), params: {
      task: { case_id: kase.id }
    }, headers: auth_headers(:bench_chair), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal kase.id, body["case_id"]
    assert_equal "CA-000001", body["case"]["public_id"]
    assert_equal 1, body["related_items"].size
  end

  test "unauthenticated requests are rejected" do
    get api_v1_tasks_path
    assert_response :unauthorized
  end
end
