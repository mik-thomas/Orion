# frozen_string_literal: true

module Orion
  module Role
    DEFAULT = "Deputy"

    # Comma-separated role slugs/labels allowed to see real magistrate PII.
    # Default: only Developer. Expand later e.g. ORION_SHOW_REAL_PII_ROLES=developer,hmcts-slm
    REAL_PII_ROLES_ENV = "ORION_SHOW_REAL_PII_ROLES"
    DEFAULT_REAL_PII_ROLES = %w[developer].freeze

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

    def real_pii_role_slugs
      raw = ENV.fetch(REAL_PII_ROLES_ENV, DEFAULT_REAL_PII_ROLES.join(","))
      raw.split(",").map { |part| slug_for(part.strip) }.reject(&:blank?).uniq.presence ||
        DEFAULT_REAL_PII_ROLES.dup
    end

    # Alias used by session JSON / docs.
    def pii_roles
      real_pii_role_slugs
    end

    # True when this role may see real magistrate names, emails, and reference codes.
    def real_pii?(role)
      real_pii_role_slugs.include?(slug_for(role))
    end

    # Back-compat alias — means real identifiable names.
    def names_visible?(role)
      real_pii?(role)
    end

    # Roster exposes emails; same allowlist as real PII.
    def roster_access?(role)
      real_pii?(role)
    end

    def display_name(magistrate, role)
      if real_pii?(role)
        magistrate.full_name
      else
        Orion::PiiAnonymizer.for_magistrate(magistrate)["display_name"]
      end
    end

    def reference_code(magistrate, role)
      if real_pii?(role)
        magistrate.reference_code
      else
        Orion::PiiAnonymizer.for_magistrate(magistrate)["reference_code"]
      end
    end
  end
end
