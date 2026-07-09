# frozen_string_literal: true

require "test_helper"

class MagistrateCompliancePeriodFilterTest < ActionDispatch::IntegrationTest
  setup do
    @magistrate = magistrates(:alice)
    @magistrate.update!(date_of_appointment: Date.new(2020, 4, 1))
    @courthouse = courthouses(:one)
    @sitting_type = SittingType.create!(name: "Adult Crime")

    7.times do |index|
      Sitting.create!(
        magistrate: @magistrate,
        courthouse: @courthouse,
        sitting_type: @sitting_type,
        session_date: Date.new(2025, 4, 1) + index.weeks,
        session: "Full",
        status: "completed",
        court_type: "Crime"
      )
    end

    5.times do |index|
      TrainingRecord.create!(
        magistrate: @magistrate,
        session_date: Date.new(2020, 5, 1) + index.months,
        days: 2
      )
    end
    TrainingRecord.create!(magistrate: @magistrate, session_date: Date.new(2025, 5, 1), days: 1)
  end

  test "period filter does not change compliance violations or sitting commitment" do
    travel_to Date.new(2025, 10, 1) do
      get api_v1_magistrate_path(@magistrate), headers: { "X-Orion-Role" => "Developer" }
      assert_response :success
      current = JSON.parse(response.body)

      get api_v1_magistrate_path(@magistrate, fiscal_year: "2023-24"),
          headers: { "X-Orion-Role" => "Developer" }
      assert_response :success
      historical = JSON.parse(response.body)

      assert_equal current["violations"], historical["violations"]
      assert_equal current["has_violations"], historical["has_violations"]
      assert_equal current["sitting_commitment"], historical["sitting_commitment"]
      assert_equal false, current["has_violations"]
      assert_equal 7.0, current["sitting_commitment"]["full_days_completed"]
    end
  end
end
