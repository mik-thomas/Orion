# frozen_string_literal: true

# Seed shareable demo accounts for local + Railway. Passwords are intentional demo
# credentials (see docs/login.md). Change via rails console before sharing beyond MVP.
[
  {
    username: "bench.chair",
    email: "bench.chair@orion.local",
    password: "BenchChair-Demo-2026",
    role: "bench_chair",
    display_name: "Bench Chair"
  },
  {
    username: "developer",
    email: "developer@orion.local",
    password: "Developer-Demo-2026",
    role: "developer",
    display_name: "Michael Thomas"
  },
  {
    username: "hmcts.slm",
    email: "hmcts.slm@orion.local",
    password: "HmctsSlm-Demo-2026",
    role: "hmcts_slm",
    display_name: "HMCTS-SLM"
  },
  {
    username: "deputy",
    email: "deputy@orion.local",
    password: "Deputy-Demo-2026",
    role: "deputy",
    display_name: "Deputy"
  }
].each do |attrs|
  user = User.find_or_initialize_by(username: attrs[:username])
  user.assign_attributes(
    email: attrs[:email],
    role: attrs[:role],
    display_name: attrs[:display_name],
    password: attrs[:password],
    password_confirmation: attrs[:password]
  )
  user.save!
end


bench_chair = User.find_by!(username: "bench.chair")
deputy = User.find_by!(username: "deputy")
developer = User.find_by!(username: "developer")

[
  {
    title: "Confirm next month's rota coverage",
    description: "Check vacancies for adult and family sittings and flag gaps to HMCTS-SLM.",
    status: "open",
    priority: "high",
    due_on: Date.current + 7.days,
    report_notes: nil
  },
  {
    title: "Follow up overdue appraisals",
    description: "List magistrates with appraisal due within 30 days and propose review dates.",
    status: "open",
    priority: "normal",
    due_on: Date.current + 14.days,
    report_notes: "Started contacting clerks for availability."
  },
  {
    title: "Report on LOA return readiness",
    description: "Summarise magistrates due to return from leave this quarter.",
    status: "closed",
    priority: "normal",
    due_on: Date.current - 3.days,
    completed_at: 2.days.ago,
    report_notes: "Three returns confirmed; one extended. Shared summary with Bench Chair."
  }
].each do |attrs|
  task = Task.find_or_initialize_by(title: attrs[:title], created_by_id: bench_chair.id)
  task.assign_attributes(
    description: attrs[:description],
    status: attrs[:status],
    priority: attrs[:priority],
    due_on: attrs[:due_on],
    completed_at: attrs[:completed_at],
    report_notes: attrs[:report_notes],
    assigned_to: deputy,
    updated_by: bench_chair
  )
  task.save!
end

# Demo case + notes when at least one magistrate exists (e.g. after import).
magistrate = Magistrate.order(:id).first
if magistrate
  demo_case = Case.find_or_initialize_by(magistrate: magistrate, title: "Appraisal follow-up")
  demo_case.assign_attributes(
    reference: "DEMO-CASE-1",
    status: "open",
    summary: "Notes and tasks linked to this magistrate for demo walkthroughs.",
    case_type: "appraisal",
    created_by: developer,
    updated_by: developer
  )
  demo_case.save!

  [
    {
      body: "Initial contact made with clerk regarding appraisal scheduling.",
      occurred_at: 5.days.ago
    },
    {
      body: "Magistrate confirmed availability for next month's panel.",
      occurred_at: 2.days.ago
    }
  ].each do |attrs|
    note = Note.find_or_initialize_by(case: demo_case, body: attrs[:body])
    note.assign_attributes(
      author_name: developer.display_name,
      occurred_at: attrs[:occurred_at],
      created_by: developer,
      updated_by: developer
    )
    note.save!
  end

  linked = Task.find_or_initialize_by(title: "Chase appraisal date for demo case", created_by_id: bench_chair.id)
  linked.assign_attributes(
    description: "Linked to the demo appraisal case.",
    status: "open",
    priority: "normal",
    due_on: Date.current + 10.days,
    assigned_to: deputy,
    updated_by: bench_chair,
    case: demo_case,
    note: demo_case.notes.chronological.first
  )
  linked.save!
end

# Sample magistrate data is loaded via: bin/rails orion:import_south_yorkshire
