# frozen_string_literal: true

namespace :orion do
  desc "Import South Yorkshire spreadsheet data from ORION_IMPORT_ROOT (RESUME=1 to continue after failure)"
  task import_south_yorkshire: :environment do
    # Long bulk imports can hit PG prepared-statement cache errors when rows are
    # created mid-run (e.g. magistrates from sitting sheets).
    ActiveRecord::Base.establish_connection(
      ActiveRecord::Base.connection_db_config.configuration_hash.merge(prepared_statements: false)
    )

    resume = %w[1 true yes].include?(ENV.fetch("RESUME", "0").downcase)
    additive = %w[1 true yes].include?(ENV.fetch("ADDITIVE", "0").downcase)

    if additive && resume
      warn "[Orion Import] ADDITIVE=1 takes precedence over RESUME (running all phases, no truncate)"
    end

    started_at = Time.current
    mode =
      if additive
        "additive"
      elsif resume
        "resume"
      else
        "full"
      end
    puts "[Orion Import] ========================================"
    puts "[Orion Import] South Yorkshire import starting at #{started_at}"
    puts "[Orion Import] Data root: #{ENV.fetch('ORION_IMPORT_ROOT', '/Users/michaelthomas/Desktop/Courts')}"
    puts "[Orion Import] Mode: #{mode}"
    puts "[Orion Import] ========================================"

    stats = Orion::SouthYorkshireImporter.new(
      clear: !resume && !additive,
      resume: resume && !additive,
      additive: additive
    ).import!

    elapsed = (Time.current - started_at).round(1)
    puts "[Orion Import] ========================================"
    puts "[Orion Import] Import complete in #{elapsed}s"
    puts "[Orion Import] Summary:"
    stats.sort.each { |key, value| puts "[Orion Import]   #{key}: #{value}" }
    puts "[Orion Import] Database totals:"
    puts "[Orion Import]   magistrates: #{Magistrate.count}"
    puts "[Orion Import]   courthouses: #{Courthouse.count}"
    puts "[Orion Import]   sittings completed: #{Sitting.completed.count}"
    puts "[Orion Import]   sittings vacated: #{Sitting.vacated.count}"
    puts "[Orion Import]   sittings cancelled: #{Sitting.cancelled.count}"
    puts "[Orion Import]   court types: #{Sitting.group(:court_type).count.sort.to_h}"
    puts "[Orion Import] ========================================"
  end
end
