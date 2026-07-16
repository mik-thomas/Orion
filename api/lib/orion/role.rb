# frozen_string_literal: true

module Orion
  module Role
    DEFAULT = "Deputy"

    MANAGER_ROLES = %w[hmcts-slm developer].freeze

    LABELS = {
      "hmcts-slm" => "HMCTS-SLM",
      "hmcts_slm" => "HMCTS-SLM",
      "developer" => "Developer",
      "bench-chair" => "Bench Chair",
      "bench_chair" => "Bench Chair",
      "deputy" => "Deputy"
    }.freeze

    SLUGS = {
      "hmcts-slm" => "hmcts_slm",
      "hmcts_slm" => "hmcts_slm",
      "developer" => "developer",
      "bench-chair" => "bench_chair",
      "bench_chair" => "bench_chair",
      "deputy" => "deputy"
    }.freeze

    module_function

    def parse(header)
      normalized = normalize(header)
      return DEFAULT if normalized.blank?

      LABELS.fetch(normalized, DEFAULT)
    end

    def label_for(slug_or_label)
      parse(slug_or_label)
    end

    def slug_for(value)
      normalized = normalize(value)
      SLUGS.fetch(normalized, "deputy")
    end

    def normalize(value)
      value.to_s.strip.downcase.gsub(/\s+/, "-").tr("_", "-")
    end

    def names_visible?(role)
      MANAGER_ROLES.include?(normalize(role))
    end

    def roster_access?(role)
      names_visible?(role)
    end

    def display_name(magistrate, role)
      names_visible?(role) ? magistrate.full_name : magistrate.reference_code
    end
  end
end
