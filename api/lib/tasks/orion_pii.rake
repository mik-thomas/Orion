# frozen_string_literal: true

namespace :orion do
  desc "Verify PII gate: developer sees real names; other roles get stable anonymised identities"
  task verify_pii_gate: :environment do
    magistrate = Magistrate.order(:id).first
    abort "No magistrates in the database — import or seed first." unless magistrate

    real = magistrate.full_name
    fake = Orion::PiiAnonymizer.for_magistrate(magistrate)

    puts "Magistrate id=#{magistrate.id}"
    puts "  Real name (Developer only): #{real} / #{magistrate.reference_code}"
    puts "  Anonymised identity:        #{fake['display_name']} / #{fake['reference_code']}"
    puts
    puts "ORION_SHOW_REAL_PII_ROLES=#{ENV.fetch('ORION_SHOW_REAL_PII_ROLES', '(unset → developer)')}"
    puts "Allowlist: #{Orion::Role.pii_roles.join(', ')}"
    puts
    %w[developer bench_chair deputy hmcts_slm].each do |slug|
      label = Orion::Role.label_for(slug)
      visible = Orion::Role.real_pii?(label)
      shown = Orion::Role.display_name(magistrate, label)
      puts "  #{label.ljust(12)} real_pii=#{visible}  display=#{shown}"
    end
    puts
    puts "OK — colleagues should use bench.chair (anonymised); Michael uses developer (real PII)."
  end
end
