module JsonRenderable
  extend ActiveSupport::Concern

  private

  def courthouse_json(courthouse)
    courthouse.as_json(only: %i[id name borough code])
  end

  def magistrate_summary_json(magistrate)
    magistrate.as_json(only: %i[id first_name last_name email date_of_appointment reasonable_adjustments]).merge(
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
    sitting.as_json(only: %i[id magistrate_id courthouse_id sitting_type_id session_date starts_at ends_at vacated vacated_reason]).merge(
      "magistrate_name" => sitting.magistrate.full_name,
      "courthouse" => courthouse_json(sitting.courthouse),
      "sitting_type" => sitting_type_json(sitting.sitting_type),
      "away_from_home_court" => sitting.magistrate.home_courthouse_id != sitting.courthouse_id
    )
  end
end
