# frozen_string_literal: true

module Orion
  module MagistrateCompliance
    Violation = Data.define(:code, :severity, :message, :actual, :required, :year)

    module_function

    def violations_for(magistrate, as_of: Date.current)
      return [] unless magistrate.date_of_appointment.present?

      results = []
      results << tenure_violation(magistrate)
      results.concat(court_day_violations(magistrate, as_of:))
      results.concat(training_violations(magistrate, as_of:))
      results.compact.map { |violation| violation.to_h.transform_keys(&:to_s) }
    end

    def tenure_violation(magistrate)
      return nil unless magistrate.leaving_date.present?

      served_days = (magistrate.leaving_date - magistrate.date_of_appointment).to_i
      required_days = (Domain::MIN_TENURE_YEARS * 365.25).to_i
      return nil if served_days >= required_days

      served_years = (served_days / 365.25).round(1)
      Violation.new(
        code: "short_tenure",
        severity: "red",
        message: "Left before completing the expected #{Domain::MIN_TENURE_YEARS}-year term of service",
        actual: served_years,
        required: Domain::MIN_TENURE_YEARS,
        year: FiscalYear.fiscal_year_label_for(magistrate.leaving_date)
      )
    end

    def court_day_violations(magistrate, as_of:)
      fiscal_year = evaluation_fiscal_year(magistrate, as_of:)
      window = evaluation_window(magistrate, fiscal_year, as_of:)
      return [] if window.nil?

      start_date, end_date = window
      year_label = FiscalYear.fiscal_year_label(fiscal_year)
      sittings = magistrate.sittings.completed.where(session_date: start_date..end_date)
      typed_sittings = sittings.where.not(court_type: nil)
      court_types = typed_sittings.distinct.pluck(:court_type).compact.sort

      if court_types.size > 1
        multi_court_violations(typed_sittings, court_types, year_label, start_date, end_date)
      else
        relevant_sittings = court_types.empty? ? sittings : typed_sittings
        return [] if relevant_sittings.none? && !should_expect_court_days?(magistrate, start_date, end_date)

        single_court_violations(relevant_sittings, year_label, start_date, end_date)
      end
    end

    def should_expect_court_days?(magistrate, start_date, end_date)
      return false if end_date < start_date

      magistrate.active? || magistrate.leaving_date&.between?(start_date, end_date)
    end

    def multi_court_violations(sittings, court_types, year_label, start_date, end_date)
      violations = []
      total_half_days = half_days_for_sittings(sittings)
      required_total = prorated_minimum(Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL, start_date, end_date)

      if total_half_days < required_total
        violations << Violation.new(
          code: "insufficient_multi_court_days",
          severity: "red",
          message: "Sitting in #{court_types.join(', ')} courts requires at least #{Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL} half days per fiscal year",
          actual: total_half_days,
          required: required_total,
          year: year_label
        )
      end

      court_types.each do |court_type|
        type_sittings = sittings.where(court_type:)
        type_half_days = half_days_for_sittings(type_sittings)
        required_per_type = prorated_minimum(Domain::MULTI_COURT_MIN_HALF_DAYS_PER_TYPE, start_date, end_date)

        next if type_half_days >= required_per_type

        violations << Violation.new(
          code: "insufficient_court_type_days",
          severity: "red",
          message: "Requires at least #{Domain::MULTI_COURT_MIN_HALF_DAYS_PER_TYPE} half days per fiscal year in #{court_type} court",
          actual: type_half_days,
          required: required_per_type,
          year: year_label
        )
      end

      violations
    end

    def single_court_violations(sittings, year_label, start_date, end_date)
      half_days = half_days_for_sittings(sittings)
      required_half_days = prorated_minimum(Domain::MIN_HALF_DAYS_PER_YEAR, start_date, end_date)
      return [] if half_days >= required_half_days

      [
        Violation.new(
          code: "insufficient_court_days",
          severity: "red",
          message: "Requires at least #{Domain::MIN_FULL_DAYS_PER_YEAR} full days (#{Domain::MIN_HALF_DAYS_PER_YEAR} half days) per fiscal year in court",
          actual: half_days,
          required: required_half_days,
          year: year_label
        )
      ]
    end

    def training_violations(magistrate, as_of:)
      violations = []
      appointment = magistrate.date_of_appointment
      first_two_years_end = appointment + Domain::INITIAL_TRAINING_YEARS.years

      if as_of >= first_two_years_end
        training_days = training_days_in_range(magistrate, appointment, first_two_years_end - 1.day)
        if training_days < Domain::TRAINING_DAYS_FIRST_TWO_YEARS
          violations << Violation.new(
            code: "insufficient_initial_training",
            severity: "red",
            message: "Requires about #{Domain::TRAINING_DAYS_FIRST_TWO_YEARS} days of training in the first #{Domain::INITIAL_TRAINING_YEARS} years",
            actual: training_days,
            required: Domain::TRAINING_DAYS_FIRST_TWO_YEARS,
            year: FiscalYear.fiscal_year_label_for(first_two_years_end)
          )
        end
      end

      fiscal_year = evaluation_fiscal_year(magistrate, as_of:)
      fy_start, fy_end = FiscalYear.fiscal_year_dates(fiscal_year)
      return violations if fy_end < first_two_years_end

      period_start = [fy_start, appointment].max
      period_end = [fy_end, as_of, magistrate.leaving_date].compact.min
      annual_period_start = [period_start, first_two_years_end].max
      return violations if annual_period_start > period_end

      days = training_days_in_range(magistrate, annual_period_start, period_end)
      required = prorated_minimum(Domain::MIN_TRAINING_DAYS_PER_YEAR_AFTER, annual_period_start, period_end)
      return violations if days >= required

      violations << Violation.new(
        code: "insufficient_annual_training",
        severity: "red",
        message: "Requires about #{Domain::MIN_TRAINING_DAYS_PER_YEAR_AFTER}–#{Domain::MAX_TRAINING_DAYS_PER_YEAR_AFTER} days of training per fiscal year after the first #{Domain::INITIAL_TRAINING_YEARS} years",
        actual: days,
        required:,
        year: FiscalYear.fiscal_year_label(fiscal_year)
      )

      violations
    end

    def half_days_for_sittings(sittings)
      grouped = sittings.to_a.group_by(&:session_date)
      grouped.sum do |_date, day_sittings|
        half_days_for_date(day_sittings)
      end
    end

    def half_days_for_date(day_sittings)
      sessions = day_sittings.map { |sitting| normalize_session(sitting.session) }

      return 2 if sessions.any?(:full)
      return 2 if sessions.include?(:am) && sessions.include?(:pm)

      day_sittings.size.clamp(1, 2)
    end

    def normalize_session(value)
      session = value.to_s.strip.downcase
      return :full if session.match?(/\b(full|all day|day)\b/)
      return :am if session.match?(/\b(am|morning)\b/)
      return :pm if session.match?(/\b(pm|afternoon)\b/)

      :unknown
    end

    def training_days_in_range(magistrate, start_date, end_date)
      return 0 if end_date < start_date

      magistrate.training_records
        .where(session_date: start_date..end_date)
        .sum(:days)
        .to_f
    end

    def evaluation_fiscal_year(magistrate, as_of:)
      eval_date = if magistrate.leaving_date.present? && magistrate.leaving_date < as_of
                    magistrate.leaving_date
                  else
                    as_of
                  end
      FiscalYear.fiscal_year_for(eval_date)
    end

    def evaluation_window(magistrate, fiscal_year, as_of:)
      fy_start, fy_end = FiscalYear.fiscal_year_dates(fiscal_year)
      start_date = [fy_start, magistrate.date_of_appointment].max
      end_date = [fy_end, as_of, magistrate.leaving_date].compact.min
      return nil if end_date < start_date

      [start_date, end_date]
    end

    def prorated_minimum(minimum, start_date, end_date)
      fiscal_year = FiscalYear.fiscal_year_for(start_date)
      fy_start, fy_end = FiscalYear.fiscal_year_dates(fiscal_year)
      return minimum if end_date >= fy_end

      total_days = (fy_end - fy_start + 1).to_f
      eligible_days = (end_date - start_date + 1).to_f
      [(minimum * eligible_days / total_days).ceil, 1].max
    end
  end
end
