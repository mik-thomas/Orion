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
    status: "in_progress",
    priority: "normal",
    due_on: Date.current + 14.days,
    report_notes: "Started contacting clerks for availability."
  },
  {
    title: "Report on LOA return readiness",
    description: "Summarise magistrates due to return from leave this quarter.",
    status: "done",
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
    assigned_to: deputy
  )
  task.save!
end

# Sample magistrate data is loaded via: bin/rails orion:import_south_yorkshire
