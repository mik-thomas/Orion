# frozen_string_literal: true

namespace :orion do
  desc "Remove duplicate sittings/magistrates/leaves/training (DRY_RUN=1 to preview)"
  task dedupe: :environment do
    dry_run = %w[1 true yes].include?(ENV.fetch("DRY_RUN", "0").downcase)

    puts "[Orion Dedupe] ========================================"
    puts "[Orion Dedupe] Mode: #{dry_run ? 'dry run (no changes)' : 'live'}"
    puts "[Orion Dedupe] Before:"
    puts "[Orion Dedupe]   sittings: #{Sitting.count}"
    puts "[Orion Dedupe]   magistrates: #{Magistrate.count}"
    puts "[Orion Dedupe]   leaves: #{LeaveOfAbsence.count}"
    puts "[Orion Dedupe]   training records: #{TrainingRecord.count}"

    stats = Orion::DataDeduper.new(dry_run: dry_run).dedupe!

    puts "[Orion Dedupe] Results:"
    stats.sort.each { |key, value| puts "[Orion Dedupe]   #{key}: #{value}" }

    unless dry_run
      puts "[Orion Dedupe] After:"
      puts "[Orion Dedupe]   sittings: #{Sitting.count}"
      puts "[Orion Dedupe]   magistrates: #{Magistrate.count}"
      puts "[Orion Dedupe]   leaves: #{LeaveOfAbsence.count}"
      puts "[Orion Dedupe]   training records: #{TrainingRecord.count}"
    end

    puts "[Orion Dedupe] ========================================"
  end
end
