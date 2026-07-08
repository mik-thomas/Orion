# frozen_string_literal: true

namespace :orion do
  desc "Import South Yorkshire spreadsheet data from ORION_IMPORT_ROOT"
  task import_south_yorkshire: :environment do
    started_at = Time.current
    puts "[Orion Import] ========================================"
    puts "[Orion Import] South Yorkshire import starting at #{started_at}"
    puts "[Orion Import] Data root: #{ENV.fetch('ORION_IMPORT_ROOT', '/Users/michaelthomas/Desktop/Courts')}"
    puts "[Orion Import] ========================================"

    stats = Orion::SouthYorkshireImporter.new.import!

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
