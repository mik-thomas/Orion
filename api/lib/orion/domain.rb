# frozen_string_literal: true

module Orion
  module Domain
    CLUSTER = "North West"
    BENCH = "South Yorkshire"

    LOCATIONS = %w[Barnsley Doncaster Grimsby Sheffield].freeze

    LOCATION_ALIASES = {
      "barnsley law courts" => "Barnsley",
      "doncaster mc" => "Doncaster",
      "sheffield mc" => "Sheffield",
      "sheffield combined court" => "Sheffield",
      "grimsby" => "Grimsby"
    }.freeze

    COURT_TYPES = %w[Crime Youth Family].freeze

    PANEL_TO_COURT_TYPE = {
      "ADULT" => "Crime",
      "YOUTH" => "Youth",
      "FAMILY" => "Family"
    }.freeze

    SITTING_POSITIONS = %w[winger presiding_justice single_justice].freeze

    BENCH_ROLES = %w[appraiser deputy bench_chair].freeze

    APPRAISAL_STATUSES = %w[new post_threshold].freeze

    BUSINESS_TYPES = [
      "Remands",
      "Trials",
      "NGP",
      "GAP",
      "SJP",
      "Not Guilty Anticipated Plea",
      "Guilty Anticipated Plea",
      "Single Justice"
    ].freeze

    CANCELLATION_CATEGORIES = %w[magistrate hmcts district_judge court unknown].freeze

    MIN_TENURE_YEARS = 5
    MIN_FULL_DAYS_PER_YEAR = 13
    MIN_HALF_DAYS_PER_YEAR = 26
    MULTI_COURT_MIN_HALF_DAYS_TOTAL = 30
    MULTI_COURT_MIN_HALF_DAYS_PER_TYPE = 15

    def self.normalize_location(name)
      raw = name.to_s.strip
      return nil if raw.blank?

      key = raw.downcase
      return LOCATION_ALIASES[key] if LOCATION_ALIASES.key?(key)

      LOCATIONS.find { |location| key.include?(location.downcase) } || raw
    end

    def self.court_type_for_panel(panel)
      PANEL_TO_COURT_TYPE[panel.to_s.strip.upcase] || "Crime"
    end

    def self.normalize_position(position)
      value = position.to_s.strip.downcase
      return "presiding_justice" if value.include?("presiding")
      return "single_justice" if value.include?("single justice")
      return "winger" if value.include?("winger")

      nil
    end

    def self.appraisal_cycle_years(presiding_justice:)
      presiding_justice ? 2 : 3
    end

    def self.cancellation_category(reason:, action_by:)
      reason_s = reason.to_s.strip
      action_s = action_by.to_s.strip
      return nil if reason_s.blank? && action_s.blank?

      combined = "#{reason_s} #{action_s}".downcase

      return "district_judge" if combined.match?(/\b(dj|district judge)\b/) || combined.include?("court requires a dj")
      return "magistrate" if combined.include?("magistrate") || combined.include?("vacated by magistrate")
      return "hmcts" if combined.include?("hmcts") || combined.include?("removed by ra") || combined.include?("legal admin")
      return "court" if combined.match?(/\b(court|clerk)\b/) && !combined.include?("magistrate")
      return "hmcts" if action_s.present?

      "unknown"
    end

    def self.normalize_court_room(venue_name)
      value = venue_name.to_s.strip
      return nil if value.blank?

      if value.match?(/court\s*(\d+)/i)
        number = value.match(/court\s*(\d+)/i)[1]
        return "Court #{number.to_i}"
      end

      value
    end
  end
end
