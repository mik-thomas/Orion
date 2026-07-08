module JsonRenderable
  extend ActiveSupport::Concern

  private

      def courthouse_json(courthouse)
        courthouse.as_json(only: %i[id name cluster bench code])
      end

      def magistrate_summary_json(magistrate)
        magistrate.as_json(only: %i[id first_name last_name email date_of_appointment reasonable_adjustments title frequency sitting_pattern leaving_date leaving_reason active cluster bench bench_role appraisal_status appraisal_cycle_years presiding_justice last_appraisal_on last_appraiser]).merge(
          "full_name" => magistrate.full_name,
          "home_courthouse" => magistrate.home_courthouse && courthouse_json(magistrate.home_courthouse),
          "active_leave" => magistrate.active_leave?
        )
      end

  def magistrate_detail_json(magistrate)
    magistrate_summary_json(magistrate).merge(
      "sitting_locations" => magistrate.sitting_locations.map { |c| courthouse_json(c) },
      "leaves_of_absence" => magistrate.leaves_of_absence.ordered.map { |leave| leave_json(leave) },
      "cases" => magistrate.cases.order(updated_at: :desc).map { |kase| case_json(kase) }
    )
  end

  def leave_json(leave)
    leave.as_json(only: %i[id magistrate_id starts_on ends_on reason notes]).merge(
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
          "magistrate_name" => sitting.magistrate.full_name,
          "courthouse" => courthouse_json(sitting.courthouse),
          "sitting_type" => sitting_type_json(sitting.sitting_type),
          "away_from_home_court" => sitting.magistrate.home_courthouse_id.present? && sitting.courthouse_id != sitting.magistrate.home_courthouse_id
        )
      end
end
