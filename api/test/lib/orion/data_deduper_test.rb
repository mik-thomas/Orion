# frozen_string_literal: true

require "test_helper"

class SittingImportKeyTest < ActiveSupport::TestCase
  test "build is stable regardless of status or source" do
    attrs = {
      magistrate_email: "jane.doe@example.com",
      session_date: Date.new(2026, 3, 31),
      session: "AM",
      courthouse_name: "Sheffield",
      venue_name: "Court 1",
      sitting_type_name: "General",
      panel: "Adult",
      position: "Winger"
    }

    first = Orion::SittingImportKey.build(**attrs)
    second = Orion::SittingImportKey.build(**attrs.merge(session: " AM "))

    assert_equal first, second
  end

  test "status priority prefers completed over vacated over cancelled" do
    assert_operator Orion::SittingImportKey.status_priority("completed"), :>,
                    Orion::SittingImportKey.status_priority("vacated")
    assert_operator Orion::SittingImportKey.status_priority("vacated"), :>,
                    Orion::SittingImportKey.status_priority("cancelled")
  end
end

class DataDeduperTest < ActiveSupport::TestCase
  test "pick_sitting_keeper prefers completed over vacated" do
    deduper = Orion::DataDeduper.new
    now = Time.current
    rows = [
      { "id" => 1, "status" => "vacated", "updated_at" => now, "import_key" => "vacated-key" },
      { "id" => 2, "status" => "completed", "updated_at" => now, "import_key" => "completed-key" }
    ]

    keeper = deduper.send(:pick_sitting_keeper, rows)

    assert_equal 2, keeper["id"]
  end
end
