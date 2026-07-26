# frozen_string_literal: true

require "test_helper"

class MagistrateComplianceTest < ActiveSupport::TestCase
  setup do
    @magistrate = magistrates(:alice)
    @magistrate.update!(date_of_appointment: Date.new(2020, 4, 1))
  end

  test "active leave without review date raises warning" do
    leaves_of_absence(:alice_active).update!(next_review_on: nil)

    travel_to Date.new(2026, 3, 1) do
      codes = Orion::MagistrateCompliance.violations_for(@magistrate).map { |v| v["code"] }
      assert_includes codes, "loa_review_missing"
      warning = Orion::MagistrateCompliance.violations_for(@magistrate).find { |v| v["code"] == "loa_review_missing" }
      assert_equal "yellow", warning["severity"]
    end
  end

  test "overdue loa review raises violation" do
    magistrate = magistrates(:bob)

    travel_to Date.new(2026, 3, 1) do
      codes = Orion::MagistrateCompliance.violations_for(magistrate).map { |v| v["code"] }
      assert_includes codes, "loa_review_overdue"
      violation = Orion::MagistrateCompliance.violations_for(magistrate).find { |v| v["code"] == "loa_review_overdue" }
      assert_equal "red", violation["severity"]
    end
  end

  test "future loa review date does not raise violation" do
    travel_to Date.new(2026, 3, 1) do
      codes = Orion::MagistrateCompliance.violations_for(@magistrate).map { |v| v["code"] }
      assert_not_includes codes, "loa_review_missing"
      assert_not_includes codes, "loa_review_overdue"
    end
  end

  test "expired leave without return raises violation" do
    @magistrate.leaves_of_absence.create!(
      starts_on: Date.new(2024, 1, 1),
      ends_on: Date.new(2024, 6, 30),
      reason: "Sabbatical"
    )

    travel_to Date.new(2026, 3, 1) do
      codes = Orion::MagistrateCompliance.violations_for(@magistrate).map { |v| v["code"] }
      assert_includes codes, "loa_expired_without_return"
      violation = Orion::MagistrateCompliance.violations_for(@magistrate).find { |v| v["code"] == "loa_expired_without_return" }
      assert_equal "red", violation["severity"]
      assert_match(/30 June 2024/, violation["message"])
    end
  end

  test "expired leave with return recorded does not raise violation" do
    @magistrate.leaves_of_absence.create!(
      starts_on: Date.new(2024, 1, 1),
      ends_on: Date.new(2024, 6, 30),
      reason: "Sabbatical",
      returned_on: Date.new(2024, 7, 1)
    )

    travel_to Date.new(2026, 3, 1) do
      codes = Orion::MagistrateCompliance.violations_for(@magistrate).map { |v| v["code"] }
      assert_not_includes codes, "loa_expired_without_return"
    end
  end

  test "leave that has not yet ended does not raise expired violation" do
    @magistrate.leaves_of_absence.create!(
      starts_on: Date.new(2024, 1, 1),
      ends_on: Date.new(2026, 6, 30),
      reason: "Sabbatical"
    )

    travel_to Date.new(2026, 3, 1) do
      codes = Orion::MagistrateCompliance.violations_for(@magistrate).map { |v| v["code"] }
      assert_not_includes codes, "loa_expired_without_return"
    end
  end
end
