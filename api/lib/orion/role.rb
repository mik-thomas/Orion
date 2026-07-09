# frozen_string_literal: true

module Orion
  module Role
    DEFAULT = "Deputy"

    MANAGER_ROLES = %w[hmcts-slm developer].freeze

    LABELS = {
      "hmcts-slm" => "HMCTS-SLM",
      "developer" => "Developer",
      "bench-chair" => "Bench Chair",
      "deputy" => "Deputy"
    }.freeze

    module_function

    def parse(header)
      normalized = normalize(header)
      return DEFAULT if normalized.blank?

      LABELS.fetch(normalized, DEFAULT)
    end

    def normalize(value)
      value.to_s.strip.downcase.gsub(/\s+/, "-")
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
