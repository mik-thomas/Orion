# frozen_string_literal: true

module Orion
  module MagistrateCompliance
    Violation = Data.define(:code, :severity, :message, :actual, :required, :year)
    SittingCommitment = Data.define(
      :fiscal_year_label,
      :full_days_completed,
      :full_days_required,
      :half_days_completed,
      :half_days_required,
      :prorated_half_days_required,
      :on_track,
      :multi_court
    )

    module_function

    def violations_for(magistrate, as_of: Date.current)
      return [] unless magistrate.date_of_appointment.present?

      results = []
      results << tenure_violation(magistrate)
      results.concat(loa_review_violations(magistrate, as_of:))
      results.concat(court_day_violations(magistrate, as_of:))
      results.compact.map { |violation| violation.to_h.transform_keys(&:to_s) }
    end

    def sitting_commitment_for(magistrate, as_of: Date.current)
      return nil unless magistrate.date_of_appointment.present?

      evaluation = court_day_evaluation(magistrate, as_of:)
      return nil if evaluation.nil?

      build_sitting_commitment(evaluation)
    end

    def loa_review_violations(magistrate, as_of:)
      magistrate.current_leaves.flat_map do |leave|
        if leave.next_review_on.blank?
          [
            Violation.new(
              code: "loa_review_missing",
              severity: "yellow",
              message: "On leave — next LOA review date is not recorded",
              actual: nil,
              required: nil,
              year: nil
            )
          ]
        elsif leave.next_review_on < as_of
          [
            Violation.new(
              code: "loa_review_overdue",
              severity: "red",
              message: "On leave — LOA review was due on #{leave.next_review_on.strftime('%d %B %Y')}",
              actual: nil,
              required: nil,
              year: nil
            )
          ]
        else
          []
        end
      end
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
      evaluation = court_day_evaluation(magistrate, as_of:)
      return [] if evaluation.nil?

      year_label = evaluation[:year_label]
      start_date = evaluation[:start_date]
      end_date = evaluation[:end_date]
      court_types = evaluation[:court_types]
      sittings = evaluation[:sittings]
      typed_sittings = evaluation[:typed_sittings]

      if court_types.size > 1
        multi_court_violations(typed_sittings, court_types, year_label, start_date, end_date)
      else
        relevant_sittings = court_types.empty? ? sittings : typed_sittings
        return [] if relevant_sittings.none? && !should_expect_court_days?(magistrate, start_date, end_date)

        single_court_violations(relevant_sittings, year_label, start_date, end_date)
      end
    end

    def court_day_evaluation(magistrate, as_of:)
      fiscal_year = FiscalYear.current_fiscal_year(as_of:)
      window = evaluation_window(magistrate, fiscal_year, as_of:)
      return nil if window.nil?

      start_date, end_date = window
      sittings = magistrate.sittings.completed.where(session_date: start_date..end_date)
      typed_sittings = sittings.where.not(court_type: nil)
      court_types = typed_sittings.distinct.pluck(:court_type).compact.sort

      {
        fiscal_year: fiscal_year,
        year_label: FiscalYear.fiscal_year_label(fiscal_year),
        start_date: start_date,
        end_date: end_date,
        sittings: sittings,
        typed_sittings: typed_sittings,
        court_types: court_types,
        multi_court: court_types.size > 1
      }
    end

    def build_sitting_commitment(evaluation)
      start_date = evaluation[:start_date]
      end_date = evaluation[:end_date]
      year_label = evaluation[:year_label]
      multi_court = evaluation[:multi_court]

      if multi_court
        half_days = half_days_for_sittings(evaluation[:typed_sittings])
        required_half_days = Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL
      else
        relevant_sittings = evaluation[:court_types].empty? ? evaluation[:sittings] : evaluation[:typed_sittings]
        half_days = half_days_for_sittings(relevant_sittings)
        required_half_days = Domain::MIN_HALF_DAYS_PER_YEAR
      end

      prorated_required = prorated_minimum(required_half_days, start_date, end_date)
      on_track = half_days >= prorated_required

      SittingCommitment.new(
        fiscal_year_label: year_label,
        full_days_completed: full_day_equivalents(half_days),
        full_days_required: full_day_equivalents(required_half_days),
        half_days_completed: half_days,
        half_days_required: required_half_days,
        prorated_half_days_required: prorated_required,
        on_track: on_track,
        multi_court: multi_court
      ).to_h.transform_keys(&:to_s)
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
        full_completed = full_day_equivalents(total_half_days)
        full_required = full_day_equivalents(Domain::MULTI_COURT_MIN_HALF_DAYS_TOTAL)
        prorated_full = full_day_equivalents(required_total)
        violations << Violation.new(
          code: "insufficient_multi_court_days",
          severity: "red",
          message: "Not on track to meet sitting commitment for #{year_label}: #{full_completed}/#{full_required} full days across #{court_types.join(', ')} courts (requires #{prorated_full} by this point in the fiscal year)",
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

        full_completed = full_day_equivalents(type_half_days)
        full_required = full_day_equivalents(Domain::MULTI_COURT_MIN_HALF_DAYS_PER_TYPE)
        prorated_full = full_day_equivalents(required_per_type)
        violations << Violation.new(
          code: "insufficient_court_type_days",
          severity: "red",
          message: "Not on track to meet sitting commitment for #{year_label}: #{full_completed}/#{full_required} full days in #{court_type} court (requires #{prorated_full} by this point in the fiscal year)",
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

      full_completed = full_day_equivalents(half_days)
      full_required = Domain::MIN_FULL_DAYS_PER_YEAR
      prorated_full = full_day_equivalents(required_half_days)

      [
        Violation.new(
          code: "insufficient_court_days",
          severity: "red",
          message: "Not on track to meet sitting commitment for #{year_label}: #{full_completed}/#{full_required} full days completed (requires #{prorated_full} by this point in the fiscal year)",
          actual: half_days,
          required: required_half_days,
          year: year_label
        )
      ]
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

    def full_day_equivalents(half_days)
      (half_days / 2.0).round(1)
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
