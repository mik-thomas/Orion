courthouses = [
  { name: "Bromsgrove Justice Centre", borough: "Bromsgrove", code: "BRO" },
  { name: "Redditch Magistrates' Court", borough: "Redditch", code: "RED" },
  { name: "Worcester Justice Centre", borough: "Worcester", code: "WOR" }
].map { |attrs| Courthouse.find_or_create_by!(name: attrs[:name]) { |c| c.assign_attributes(attrs) } }

sitting_types = [
  { name: "Remand Court", code: "remand" },
  { name: "Adult Crime", code: "adult_crime" },
  { name: "Family", code: "family" },
  { name: "Youth Court", code: "youth" }
].map { |attrs| SittingType.find_or_create_by!(name: attrs[:name]) { |st| st.assign_attributes(attrs) } }

magistrate = Magistrate.find_or_create_by!(first_name: "Alex", last_name: "Morgan") do |m|
  m.email = "alex.morgan@example.gov.uk"
  m.date_of_appointment = Date.new(2019, 3, 15)
  m.home_courthouse = courthouses[0]
  m.reasonable_adjustments = "Hearing loop available; prefers afternoon sittings."
end
magistrate.sitting_locations = courthouses.first(2)

LeaveOfAbsence.find_or_create_by!(magistrate:, starts_on: Date.new(2026, 8, 1), ends_on: Date.new(2026, 8, 14)) do |leave|
  leave.reason = "Annual leave"
  leave.notes = "Cover arranged via bench chair."
end

kase = Case.find_or_create_by!(magistrate:, reference: "ORION-001") do |c|
  c.title = "Conduct note review"
  c.status = "open"
end

Note.find_or_create_by!(case: kase, body: "Initial discussion with bench chair recorded.") do |note|
  note.author_name = "Clerk"
end

Sitting.find_or_create_by!(
  magistrate:,
  courthouse: courthouses[1],
  sitting_type: sitting_types[0],
  session_date: Date.new(2026, 7, 1)
) do |sitting|
  sitting.starts_at = Time.zone.parse("10:00")
  sitting.ends_at = Time.zone.parse("16:00")
  sitting.vacated = false
end

Sitting.find_or_create_by!(
  magistrate:,
  courthouse: courthouses[0],
  sitting_type: sitting_types[1],
  session_date: Date.new(2026, 6, 20)
) do |sitting|
  sitting.vacated = true
  sitting.vacated_reason = "Court closed — staffing"
end

Magistrate.find_or_create_by!(first_name: "Jordan", last_name: "Lee") do |m|
  m.date_of_appointment = Date.new(2021, 9, 1)
  m.home_courthouse = courthouses[2]
  m.sitting_locations = [courthouses[2]]
end
