# frozen_string_literal: true

require "test_helper"

class MagistrateSittingScoreTest < ActiveSupport::TestCase
  setup do
    @magistrate = magistrates(:alice)
    @magistrate.update!(date_of_appointment: Date.new(2020, 4, 1))
    @courthouse = courthouses(:one)
    @sitting_type = SittingType.create!(name: "Adult Crime")
  end

  test "perfect completion yields high score" do
    travel_to Date.new(2025, 10, 1) do
      10.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end

      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_equal "2025-26", score["fiscal_year_label"]
      assert_operator score["score"], :>=, 700
      assert_includes %w[Excellent Good], score["rating"]
      assert_breakdown_factor(score, "completion_rate", :>, 0)
      assert_breakdown_factor(score, "vacated_magistrate", 0)
      assert_breakdown_factor(score, "over_sitting", 0)
    end
  end

  test "vacated by magistrate reduces score" do
    travel_to Date.new(2025, 10, 1) do
      6.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end
      4.times do |index|
        create_sitting(
          session_date: Date.new(2025, 8, 1) + index.weeks,
          status: "vacated",
          cancellation_category: "magistrate"
        )
      end

      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_breakdown_factor(score, "vacated_magistrate", :<, 0)
      assert_operator score["score"], :<, 700
    end
  end

  test "court and DJ cancellations earn small bonus" do
    travel_to Date.new(2025, 10, 1) do
      8.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end
      create_sitting(
        session_date: Date.new(2025, 9, 1),
        status: "cancelled",
        cancellation_category: "district_judge"
      )
      create_sitting(
        session_date: Date.new(2025, 9, 8),
        status: "cancelled",
        cancellation_category: "court"
      )

      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_breakdown_factor(score, "external_cancellation", :>, 0)
    end
  end

  test "over-sitting beyond annual commitment penalizes score" do
    travel_to Date.new(2025, 10, 1) do
      30.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.days, status: "completed")
      end

      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_breakdown_factor(score, "over_sitting", :<, 0)
      over_item = score["breakdown"].find { |item| item["factor"] == "over_sitting" }
      assert_includes over_item["detail"], "above annual commitment"
    end
  end

  test "score is clamped between 300 and 850" do
    travel_to Date.new(2025, 12, 1) do
      20.times do |index|
        create_sitting(
          session_date: Date.new(2025, 4, 1) + index.days,
          status: "vacated",
          cancellation_category: "magistrate"
        )
      end

      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_operator score["score"], :>=, Orion::MagistrateSittingScore::MIN_SCORE
      assert_operator score["score"], :<=, Orion::MagistrateSittingScore::MAX_SCORE
      assert_equal "Poor", score["rating"]
    end
  end

  test "returns nil without appointment date" do
    @magistrate.update!(date_of_appointment: nil)

    assert_nil Orion::MagistrateSittingScore.score_for(@magistrate)
  end

  test "no scheduled sittings uses base score only" do
    travel_to Date.new(2025, 10, 1) do
      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_equal Orion::MagistrateSittingScore::BASE_SCORE, score["score"]
      assert_equal "Fair", score["rating"]
      assert_breakdown_factor(score, "completion_rate", 0)
    end
  end

  test "vacated without category counts as magistrate fault" do
    travel_to Date.new(2025, 10, 1) do
      5.times do |index|
        create_sitting(session_date: Date.new(2025, 4, 1) + index.weeks, status: "completed")
      end
      create_sitting(session_date: Date.new(2025, 9, 1), status: "vacated")

      score = Orion::MagistrateSittingScore.score_for(@magistrate)

      assert_breakdown_factor(score, "vacated_magistrate", :<, 0)
    end
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

  def assert_breakdown_factor(score, factor, matcher, expected = nil)
    item = score["breakdown"].find { |row| row["factor"] == factor }
    assert item, "Expected breakdown factor #{factor}"
    points = item["points"]
    if expected.is_a?(Symbol)
      assert_operator points, matcher, 0
    else
      assert_equal expected, points
    end
  end
end
