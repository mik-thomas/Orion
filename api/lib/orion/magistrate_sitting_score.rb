# frozen_string_literal: true

module Orion
  module MagistrateSittingScore
    SittingScore = Data.define(:score, :rating, :fiscal_year_label, :breakdown)

    BreakdownItem = Data.define(:factor, :label, :points, :detail)

    MIN_SCORE = 300
    MAX_SCORE = 850
    BASE_SCORE = 550

    COMPLETION_MAX_POINTS = 200
    VACATED_MAGISTRATE_PENALTY_PER = 12
    VACATED_MAGISTRATE_PENALTY_MAX = 150
    EXTERNAL_CANCEL_BONUS_PER = 5
    EXTERNAL_CANCEL_BONUS_MAX = 50
    OVER_SITTING_PENALTY_MAX = 200

    EXTERNAL_CATEGORIES = %w[hmcts district_judge court].freeze
    MAGISTRATE_FAULT_CATEGORIES = %w[magistrate unknown].freeze

    RATINGS = [
      { name: "Excellent", min: 750 },
      { name: "Good", min: 650 },
      { name: "Fair", min: 550 },
      { name: "Poor", min: MIN_SCORE }
    ].freeze

    module_function

    def score_for(magistrate, as_of: Date.current)
      return nil unless magistrate.date_of_appointment.present?

      evaluation = MagistrateCompliance.court_day_evaluation(magistrate, as_of:)
      return nil if evaluation.nil?

      build_score(magistrate, evaluation)
    end

    def build_score(magistrate, evaluation)
      start_date = evaluation[:start_date]
      end_date = evaluation[:end_date]
      year_label = evaluation[:year_label]
      multi_court = evaluation[:multi_court]

      all_sittings = magistrate.sittings.where(session_date: start_date..end_date)
      counts = outcome_counts(all_sittings)

      completion_points = completion_rate_points(counts)
      vacated_penalty = vacated_magistrate_penalty(all_sittings, counts)
      external_bonus = external_cancellation_bonus(all_sittings)
      over_sitting_penalty = over_sitting_penalty(evaluation)

      breakdown = [
        breakdown_item("base", "Base score", BASE_SCORE, nil),
        breakdown_item(
          "completion_rate",
          "Completion rate",
          completion_points,
          completion_detail(counts)
        ),
        breakdown_item(
          "vacated_magistrate",
          "Vacated by magistrate",
          -vacated_penalty,
          vacated_detail(all_sittings)
        ),
        breakdown_item(
          "external_cancellation",
          "Cancelled by court or DJ",
          external_bonus,
          external_detail(all_sittings)
        ),
        breakdown_item(
          "over_sitting",
          "Over-sitting",
          -over_sitting_penalty,
          over_sitting_detail(evaluation, multi_court)
        )
      ]

      raw_score = breakdown.sum { |item| item.points }
      score = raw_score.clamp(MIN_SCORE, MAX_SCORE)

      SittingScore.new(
        score: score,
        rating: rating_for(score),
        fiscal_year_label: year_label,
        breakdown: breakdown.map { |item| item.to_h.transform_keys(&:to_s) }
      ).to_h.transform_keys(&:to_s)
    end

    def outcome_counts(sittings)
      completed = sittings.completed.count
      vacated = sittings.vacated.count
      cancelled = sittings.cancelled.count
      scheduled_total = completed + vacated + cancelled

      {
        completed: completed,
        vacated: vacated,
        cancelled: cancelled,
        scheduled_total: scheduled_total
      }
    end

    def completion_rate_points(counts)
      total = counts[:scheduled_total]
      return 0 if total.zero?

      rate = counts[:completed].to_f / total
      (rate * COMPLETION_MAX_POINTS).round
    end

    def completion_detail(counts)
      total = counts[:scheduled_total]
      return "No scheduled sittings in the current fiscal year" if total.zero?

      rate_pct = (counts[:completed].to_f / total * 100).round(1)
      "#{rate_pct}% of #{total} scheduled sittings completed"
    end

    def vacated_magistrate_penalty(sittings, counts)
      fault_count = magistrate_fault_count(sittings)
      return 0 if fault_count.zero?

      [fault_count * VACATED_MAGISTRATE_PENALTY_PER, VACATED_MAGISTRATE_PENALTY_MAX].min
    end

    def magistrate_fault_count(sittings)
      sittings.count do |sitting|
        magistrate_fault?(sitting)
      end
    end

    def magistrate_fault?(sitting)
      case sitting.status
      when "vacated"
        category = sitting.cancellation_category
        category.nil? || MAGISTRATE_FAULT_CATEGORIES.include?(category)
      when "cancelled"
        sitting.cancellation_category == "magistrate"
      else
        false
      end
    end

    def vacated_detail(sittings)
      fault_count = magistrate_fault_count(sittings)
      return "No sittings vacated or cancelled by magistrate" if fault_count.zero?

      "#{fault_count} #{fault_count == 1 ? 'sitting' : 'sittings'} vacated or cancelled by magistrate"
    end

    def external_cancellation_bonus(sittings)
      count = external_cancellation_count(sittings)
      return 0 if count.zero?

      [count * EXTERNAL_CANCEL_BONUS_PER, EXTERNAL_CANCEL_BONUS_MAX].min
    end

    def external_cancellation_count(sittings)
      sittings.count do |sitting|
        next false unless %w[vacated cancelled].include?(sitting.status)

        EXTERNAL_CATEGORIES.include?(sitting.cancellation_category)
      end
    end

    def external_detail(sittings)
      count = external_cancellation_count(sittings)
      return "No court or DJ cancellations" if count.zero?

      "#{count} #{count == 1 ? 'sitting' : 'sittings'} cancelled externally (not magistrate fault)"
    end

    def over_sitting_penalty(evaluation)
      relevant = SittingForecaster.commitment_sittings(evaluation[:sittings], evaluation)
      half_days_completed = MagistrateCompliance.half_days_for_sittings(relevant)
      required_half_days = evaluation[:multi_court] ?
        Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL :
        Domain::MIN_HALF_DAYS_PER_YEAR

      excess_half_days = half_days_completed - required_half_days
      return 0 unless excess_half_days.positive?

      excess_ratio = excess_half_days.to_f / required_half_days
      [excess_ratio * OVER_SITTING_PENALTY_MAX, OVER_SITTING_PENALTY_MAX].min.round
    end

    def over_sitting_detail(evaluation, multi_court)
      relevant = SittingForecaster.commitment_sittings(evaluation[:sittings], evaluation)
      half_days_completed = MagistrateCompliance.half_days_for_sittings(relevant)
      required_half_days = multi_court ?
        Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL :
        Domain::MIN_HALF_DAYS_PER_YEAR

      if half_days_completed <= required_half_days
        scope = multi_court ? "multi-court" : "single court"
        full_required = MagistrateCompliance.full_day_equivalents(required_half_days)
        return "Within #{full_required} full-day annual commitment (#{scope})"
      end

      excess_half_days = half_days_completed - required_half_days
      excess_full_days = MagistrateCompliance.full_day_equivalents(excess_half_days)
      "#{excess_full_days} full days above annual commitment"
    end

    def rating_for(score)
      RATINGS.find { |band| score >= band[:min] }[:name]
    end

    def breakdown_item(factor, label, points, detail)
      BreakdownItem.new(factor: factor, label: label, points: points, detail: detail)
    end
  end
end
