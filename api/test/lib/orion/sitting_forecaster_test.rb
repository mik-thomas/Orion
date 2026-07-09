# frozen_string_literal: true

require "test_helper"

class SittingForecasterTest < ActiveSupport::TestCase
  setup do
    @magistrate = magistrates(:alice)
    @magistrate.update!(date_of_appointment: Date.new(2020, 4, 1))
    @courthouse = courthouses(:one)
    @sitting_type = SittingType.create!(name: "Adult Crime")
  end

  test "on track magistrate with strong completion rate" do
    travel_to Date.new(2025, 10, 1) do
      10.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end
      2.times do |index|
        create_sitting(session_date: Date.new(2025, 8, 1) + index.weeks, status: "vacated")
      end

      forecast = Orion::SittingForecaster.forecast_for(@magistrate)

      assert_equal "on_track", forecast["risk_level"]
      assert_equal false, forecast["early_warning"]
      assert_operator forecast["projected_full_days_end_of_year"], :>=, forecast["full_days_required"]
      assert_in_delta 0.833, forecast["completion_rate"], 0.01
    end
  end

  test "at risk when projected shortfall is moderate" do
    travel_to Date.new(2025, 10, 1) do
      6.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end
      2.times do |index|
        create_sitting(session_date: Date.new(2025, 8, 1) + index.weeks, status: "vacated")
      end

      forecast = Orion::SittingForecaster.forecast_for(@magistrate)

      assert_equal "at_risk", forecast["risk_level"]
      assert_equal true, forecast["early_warning"]
      assert_operator forecast["projected_shortfall_full_days"], :>=, 1.0
      assert_operator forecast["projected_shortfall_full_days"], :<, 3.0
      assert_includes forecast["message"], "At risk of missing commitment"
    end
  end

  test "unlikely to meet when projected shortfall is large" do
    travel_to Date.new(2025, 12, 1) do
      2.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.months, status: "completed")
      end
      8.times do |index|
        create_sitting(
          session_date: Date.new(2025, 6, 1) + index.weeks,
          session: index.even? ? "AM" : "PM",
          status: "cancelled",
          cancellation_category: "magistrate"
        )
      end

      forecast = Orion::SittingForecaster.forecast_for(@magistrate)

      assert_equal "unlikely_to_meet", forecast["risk_level"]
      assert_equal true, forecast["early_warning"]
      assert_operator forecast["projected_shortfall_full_days"], :>=, 3.0
      assert_includes forecast["message"], "Unlikely to meet the annual commitment"
    end
  end

  test "linear projection extrapolates completed half-days to fiscal year end" do
    travel_to Date.new(2025, 7, 1) do
      6.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end

      forecast = Orion::SittingForecaster.forecast_for(@magistrate)

      assert_equal 12, forecast["half_days_completed"]
      assert_operator forecast["projected_half_days_end_of_year"], :>, 12
      assert_includes forecast["rates"].keys, "completed_pct"
      assert_equal 100.0, forecast["rates"]["completed_pct"]
    end
  end

  test "at_risk_forecasts returns only at-risk magistrates sorted by severity" do
    bob = magistrates(:bob)
    bob.update!(date_of_appointment: Date.new(2020, 4, 1))

    travel_to Date.new(2025, 12, 1) do
      2.times { |i| create_sitting(session_date: Date.new(2025, 4, 1) + i.weeks, status: "completed") }
      6.times { |i| create_sitting(session_date: Date.new(2025, 5, 1) + i.weeks, status: "vacated") }

      12.times do |index|
        Sitting.create!(
          magistrate: bob,
          courthouse: @courthouse,
          sitting_type: @sitting_type,
          session_date: Date.new(2025, 4, 1) + index.weeks,
          session: "Full",
          status: "completed",
          court_type: "Crime"
        )
      end

      rows = Orion::SittingForecaster.at_risk_forecasts

      assert rows.any? { |row| row["magistrate_id"] == @magistrate.id }
      assert_not rows.any? { |row| row["magistrate_id"] == bob.id }
      assert_equal "unlikely_to_meet", rows.first["risk_level"]
    end
  end

  test "returns nil without appointment date" do
    @magistrate.update!(date_of_appointment: nil)

    assert_nil Orion::SittingForecaster.forecast_for(@magistrate)
  end

  private

  def create_sitting(session_date:, status:, cancellation_category: nil, session: "Full")
    Sitting.create!(
      magistrate: @magistrate,
      courthouse: @courthouse,
      sitting_type: @sitting_type,
      session_date: session_date,
      session: session,
      status: status,
      court_type: "Crime",
      cancellation_category: cancellation_category
    )
  end
end
