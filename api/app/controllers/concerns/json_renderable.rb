module JsonRenderable
  extend ActiveSupport::Concern

  private

      def courthouse_json(courthouse)
        courthouse.as_json(only: %i[id name cluster bench code])
      end

      def magistrate_summary_json(magistrate)
        violations = magistrate.compliance_violations
        base = magistrate.as_json(
          only: magistrate_summary_fields
        ).merge(
          "reference_code" => magistrate.reference_code,
          "display_name" => magistrate_display_name(magistrate),
          "name_visible" => names_visible?,
          "home_courthouse" => magistrate.home_courthouse && courthouse_json(magistrate.home_courthouse),
          "active_leave" => magistrate.active_leave?,
          "current_leaves" => magistrate.current_leaves.map { |leave| leave_json(leave) },
          "violations" => violations,
          "has_violations" => violations.any?,
          "sitting_commitment" => magistrate.sitting_commitment,
          "sitting_forecast" => magistrate.sitting_forecast,
          "sitting_score" => magistrate.sitting_score
        )

        if names_visible?
          base.merge("full_name" => magistrate.full_name)
        else
          base.merge("full_name" => nil, "first_name" => nil, "last_name" => nil)
        end
      end

      def magistrate_summary_fields
        fields = %i[
          id reference_code date_of_appointment reasonable_adjustments title frequency sitting_pattern
          leaving_date leaving_reason retirement_on active cluster bench bench_role appraisal_status appraisal_cycle_years
          presiding_justice last_appraisal_on last_appraiser last_login_on days_since_login
        ]
        fields += %i[first_name last_name] if names_visible?
        fields
      end

      def retiring_soon_json(magistrate)
        days = magistrate.days_until_retirement
        {
          "magistrate_id" => magistrate.id,
          "display_name" => magistrate_display_name(magistrate),
          "reference_code" => magistrate.reference_code,
          "retirement_on" => magistrate.retirement_on,
          "days_until_retirement" => days,
          "imminent" => magistrate.retirement_imminent?
        }
      end

      def retiring_soon_rows
        Magistrate.retiring_soon.includes(:home_courthouse).map { |magistrate| retiring_soon_json(magistrate) }
      end

      def magistrate_display_name(magistrate)
        Orion::Role.display_name(magistrate, current_role)
      end

      def magistrate_detail_json(magistrate, period: nil)
        summary = magistrate_summary_json(magistrate)
        filtered_sittings = sittings_for_period(magistrate, period)

        summary.merge(
          "period" => period && period_filter_json,
          "available_fiscal_years" => period ? available_fiscal_years_json : nil,
          "sitting_locations" => magistrate.sitting_locations.map { |c| courthouse_json(c) },
          "leaves_of_absence" => magistrate.leaves_of_absence.ordered.map { |leave| leave_json(leave) },
          "cases" => magistrate.cases.order(updated_at: :desc).map { |kase| case_json(kase) },
          "sitting_summary" => magistrate_sitting_summary_json(magistrate, sittings: filtered_sittings),
          "sittings" => filtered_sittings.ordered.map { |sitting| sitting_json(sitting) }
        )
      end

      def magistrate_roster_json(magistrate)
        {
          "id" => magistrate.id,
          "reference_code" => magistrate.reference_code,
          "full_name" => magistrate.full_name,
          "home_courthouse" => magistrate.home_courthouse&.name,
          "email" => magistrate.email
        }
      end

      def sittings_for_period(magistrate, period)
        scope = magistrate.sittings
        return scope unless period
        return scope if period.all_time?

        scope.where(session_date: period.start_date..period.end_date)
      end

  def magistrate_sitting_summary_json(magistrate, sittings: magistrate.sittings)
    {
      "totals" => {
        "completed" => sittings.completed.count,
        "vacated" => sittings.vacated.count,
        "cancelled" => sittings.cancelled.count,
        "cancelled_by_dj" => sittings.cancelled.where(cancellation_category: "district_judge").count
      },
      "by_location" => sittings.joins(:courthouse).group("courthouses.name").count
        .sort_by { |_, count| -count }
        .map { |name, count| { "courthouse" => name, "sittings" => count } },
      "by_court_type" => sittings.group(:court_type).count
        .sort_by { |_, count| -count }
        .map { |name, count| { "court_type" => name || "Unknown", "sittings" => count } },
      "by_sitting_type" => sittings.joins(:sitting_type).group("sitting_types.name").count
        .sort_by { |_, count| -count }
        .map { |name, count| { "sitting_type" => name, "sittings" => count } },
      "by_court_room" => Orion::SittingReports.court_room_rows(sittings),
      "dj_cancellations" => Orion::SittingReports.dj_cancellation_report_for(sittings),
      "home_away" => magistrate_home_away_json(magistrate, sittings)
    }
  end

  def magistrate_home_away_json(magistrate, sittings)
    home_id = magistrate.home_courthouse_id
    return nil if home_id.nil?

    completed = sittings.completed
    at_home = completed.where(courthouse_id: home_id).count
    away = completed.where.not(courthouse_id: home_id).count
    total = at_home + away

    {
      "at_home" => at_home,
      "away" => away,
      "total_completed" => total,
      "away_pct" => total.positive? ? ((away.to_f / total) * 100).round(1) : 0.0
    }
  end

  def leave_json(leave)
    leave.as_json(only: %i[id magistrate_id starts_on ends_on reason notes]).merge(
      "next_loa_review_on" => leave.next_review_on&.iso8601,
      "active" => leave.active?
    )
  end

  def case_json(kase)
    kase.as_json(only: %i[id magistrate_id reference title status created_at updated_at]).merge(
      "notes_count" => kase.notes.count
    )
  end

  def case_detail_json(kase)
    case_json(kase).merge(
      "notes" => kase.notes.order(created_at: :desc).map { |note| note_json(note) }
    )
  end

  def note_json(note)
    note.as_json(only: %i[id case_id body author_name created_at updated_at])
  end

  def sitting_type_json(sitting_type)
    sitting_type.as_json(only: %i[id name code])
  end

      def sitting_json(sitting)
        sitting.as_json(only: %i[id magistrate_id courthouse_id sitting_type_id session_date session status court_type sitting_position court_room starts_at ends_at vacated vacated_reason venue_name position panel business_type justice_area ad_hoc event_at notice_days action_reason action_by cancellation_category]).merge(
          "magistrate_name" => magistrate_display_name(sitting.magistrate),
          "courthouse" => courthouse_json(sitting.courthouse),
          "sitting_type" => sitting_type_json(sitting.sitting_type),
          "away_from_home_court" => sitting.magistrate.home_courthouse_id.present? && sitting.courthouse_id != sitting.magistrate.home_courthouse_id
        )
      end
end
