# frozen_string_literal: true

# Seed shareable login accounts for local + Railway. Passwords are intentional
# demo credentials (see docs/login.md). Change via rails console before sharing
# beyond MVP. Do not seed synthetic cases, notes, or tasks — operational data
# should come from real use; magistrate/sitting/LOA data from import.
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

# Magistrate / sitting / LOA data is loaded via: bin/rails orion:import_south_yorkshire
