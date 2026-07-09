# frozen_string_literal: true

module Orion
  module SittingForecaster
    SittingForecast = Data.define(
      :fiscal_year_label,
      :multi_court,
      :fiscal_year_progress_pct,
      :half_days_completed,
      :half_days_required,
      :full_days_completed,
      :full_days_required,
      :projected_half_days_end_of_year,
      :projected_full_days_end_of_year,
      :projected_shortfall_full_days,
      :counts,
      :rates,
      :completion_rate,
      :risk_level,
      :early_warning,
      :message
    )

    RISK_LEVELS = %w[on_track at_risk unlikely_to_meet].freeze

    COMPLETION_RATE_AT_RISK_THRESHOLD = 0.75
    MIN_YEAR_ELAPSED_FRACTION = 0.25
    AT_RISK_SHORTFALL_FULL_DAYS = 1.0
    UNLIKELY_SHORTFALL_FULL_DAYS = 3.0

    module_function

    def forecast_for(magistrate, as_of: Date.current)
      return nil unless magistrate.date_of_appointment.present?

      evaluation = MagistrateCompliance.court_day_evaluation(magistrate, as_of:)
      return nil if evaluation.nil?

      build_forecast(magistrate, evaluation, as_of:)
    end

    def at_risk_forecasts(as_of: Date.current)
      Magistrate.where.not(date_of_appointment: nil)
        .includes(:home_courthouse)
        .filter_map do |magistrate|
          forecast = forecast_for(magistrate, as_of:)
          next unless forecast
          next unless at_risk?(forecast)

          forecast.to_h.transform_keys(&:to_s).merge(
            "magistrate_id" => magistrate.id,
            "display_name" => nil # filled by controller with role-aware name
          )
        end
        .sort_by { |row| risk_sort_key(row) }
    end

    def at_risk?(forecast)
      hash = forecast.is_a?(Hash) ? forecast : forecast.to_h
      %w[at_risk unlikely_to_meet].include?(hash[:risk_level] || hash["risk_level"])
    end

    def risk_sort_key(forecast)
      hash = forecast.is_a?(Hash) ? forecast : forecast.to_h
      level = hash[:risk_level] || hash["risk_level"]
      shortfall = hash[:projected_shortfall_full_days] || hash["projected_shortfall_full_days"] || 0

      [
        level == "unlikely_to_meet" ? 0 : 1,
        -shortfall.to_f
      ]
    end

    def build_forecast(magistrate, evaluation, as_of:)
      start_date = evaluation[:start_date]
      progress_end = evaluation[:end_date]
      fiscal_year = evaluation[:fiscal_year]
      year_label = evaluation[:year_label]
      multi_court = evaluation[:multi_court]

      fy_start, fy_end = FiscalYear.fiscal_year_dates(fiscal_year)
      commitment_end = [fy_end, magistrate.leaving_date].compact.min
      eligible_total_days = (commitment_end - start_date + 1).to_f
      elapsed_days = (progress_end - start_date + 1).to_f
      progress_pct = eligible_total_days.positive? ? (elapsed_days / eligible_total_days * 100).round(1) : 0.0

      all_sittings = magistrate.sittings.where(session_date: start_date..progress_end)
      completed_sittings = all_sittings.completed
      relevant_completed = commitment_sittings(completed_sittings, evaluation)
      half_days_completed = MagistrateCompliance.half_days_for_sittings(relevant_completed)

      required_half_days = multi_court ? Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL : Domain::MIN_HALF_DAYS_PER_YEAR
      full_days_required = MagistrateCompliance.full_day_equivalents(required_half_days)
      full_days_completed = MagistrateCompliance.full_day_equivalents(half_days_completed)

      counts = sitting_counts(all_sittings)
      rates = sitting_rates(counts)
      completion_rate = rates[:completion_rate]

      projection = project_end_of_year(
        half_days_completed,
        elapsed_days,
        eligible_total_days,
        required_half_days
      )

      risk_level, early_warning = assess_risk(
        projection[:projected_half_days],
        required_half_days,
        completion_rate,
        progress_pct / 100.0
      )

      message = conversation_message(
        risk_level:,
        projected_full_days: projection[:projected_full_days],
        full_days_required:,
        year_label:,
        multi_court:
      )

      SittingForecast.new(
        fiscal_year_label: year_label,
        multi_court: multi_court,
        fiscal_year_progress_pct: progress_pct,
        half_days_completed: half_days_completed,
        half_days_required: required_half_days,
        full_days_completed: full_days_completed,
        full_days_required: full_days_required,
        projected_half_days_end_of_year: projection[:projected_half_days],
        projected_full_days_end_of_year: projection[:projected_full_days],
        projected_shortfall_full_days: projection[:shortfall_full_days],
        counts: counts.transform_keys(&:to_s),
        rates: rates.transform_keys(&:to_s),
        completion_rate: completion_rate,
        risk_level: risk_level,
        early_warning: early_warning,
        message: message
      ).to_h.transform_keys(&:to_s)
    end

    def commitment_sittings(sittings, evaluation)
      if evaluation[:multi_court]
        sittings.where.not(court_type: nil)
      elsif evaluation[:court_types].empty?
        sittings
      else
        sittings.where.not(court_type: nil)
      end
    end

    def sitting_counts(sittings)
      completed = sittings.completed.count
      vacated = sittings.vacated.count
      cancelled = sittings.cancelled.count
      cancelled_by_dj = sittings.cancelled.where(cancellation_category: "district_judge").count
      scheduled_total = completed + vacated + cancelled

      {
        completed: completed,
        vacated: vacated,
        cancelled: cancelled,
        cancelled_by_dj: cancelled_by_dj,
        loss: vacated + cancelled,
        scheduled_total: scheduled_total
      }
    end

    def sitting_rates(counts)
      total = counts[:scheduled_total]
      return zero_rates if total.zero?

      pct = ->(count) { (count.to_f / total * 100).round(1) }

      {
        completed_pct: pct.call(counts[:completed]),
        vacated_pct: pct.call(counts[:vacated]),
        cancelled_pct: pct.call(counts[:cancelled]),
        cancelled_by_dj_pct: pct.call(counts[:cancelled_by_dj]),
        loss_pct: pct.call(counts[:loss]),
        completion_rate: (counts[:completed].to_f / total).round(3)
      }
    end

    def zero_rates
      {
        completed_pct: 0.0,
        vacated_pct: 0.0,
        cancelled_pct: 0.0,
        cancelled_by_dj_pct: 0.0,
        loss_pct: 0.0,
        completion_rate: nil
      }
    end

    def project_end_of_year(half_days_completed, elapsed_days, eligible_total_days, required_half_days)
      if elapsed_days <= 0
        projected_half_days = half_days_completed.to_f
      else
        projected_half_days = half_days_completed * (eligible_total_days / elapsed_days)
      end

      projected_full_days = MagistrateCompliance.full_day_equivalents(projected_half_days)
      required_full_days = MagistrateCompliance.full_day_equivalents(required_half_days)
      shortfall_full_days = (required_full_days - projected_full_days).round(1)

      {
        projected_half_days: projected_half_days.round(1),
        projected_full_days: projected_full_days,
        shortfall_full_days: shortfall_full_days
      }
    end

    def assess_risk(projected_half_days, required_half_days, completion_rate, year_elapsed_fraction)
      projected_full = MagistrateCompliance.full_day_equivalents(projected_half_days)
      required_full = MagistrateCompliance.full_day_equivalents(required_half_days)
      shortfall = required_full - projected_full

      low_completion = completion_rate && year_elapsed_fraction >= MIN_YEAR_ELAPSED_FRACTION &&
                       completion_rate < COMPLETION_RATE_AT_RISK_THRESHOLD
      projected_shortfall = shortfall.positive?

      early_warning = projected_shortfall || low_completion

      risk_level = if shortfall >= UNLIKELY_SHORTFALL_FULL_DAYS || (low_completion && shortfall.positive?)
                     "unlikely_to_meet"
                   elsif shortfall >= AT_RISK_SHORTFALL_FULL_DAYS || low_completion
                     "at_risk"
                   else
                     "on_track"
                   end

      [risk_level, early_warning]
    end

    def conversation_message(risk_level:, projected_full_days:, full_days_required:, year_label:, multi_court:)
      scope = multi_court ? "multi-court" : "single court"
      base = "Based on current sitting rates, projected to complete #{format_days(projected_full_days)}/" \
             "#{format_days(full_days_required)} full days by the end of #{year_label} (#{scope})."

      case risk_level
      when "unlikely_to_meet"
        "#{base} Unlikely to meet the annual commitment without intervention — consider a conversation soon."
      when "at_risk"
        "#{base} At risk of missing commitment — an early conversation may help them get back on track."
      else
        "#{base} On track to meet the annual commitment."
      end
    end

    def format_days(value)
      value == value.to_i ? value.to_i.to_s : value.to_s
    end
  end
end
