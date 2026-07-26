# frozen_string_literal: true

require "test_helper"

class NotesControllerTest < ActionDispatch::IntegrationTest
  test "can update a note" do
    note = notes(:initial_contact)

    patch api_v1_note_path(note), params: {
      note: { body: "Updated appraisal note body" }
    }, headers: auth_headers(:developer), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Updated appraisal note body", body["body"]
    assert_equal "NT-0000001", body["public_id"]
    assert_equal users(:developer).id, body["updated_by"]["id"]
  end

  test "show finds note by public_id" do
    note = notes(:availability)

    get api_v1_note_path(note.public_id), headers: auth_headers(:developer)
    assert_response :success
    assert_equal "NT-0000002", JSON.parse(response.body)["public_id"]
  end
end
