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

    CANCELLATION_CATEGORIES = %w[magistrate legal_admin district_judge other].freeze

    MIN_TENURE_YEARS = 5
    MIN_FULL_DAYS_PER_YEAR = 13
    MIN_HALF_DAYS_PER_YEAR = 26
    MULTI_COURT_MIN_HALF_DAYS_TOTAL = 30
    MULTI_COURT_MIN_HALF_DAYS_PER_TYPE = 15
    INITIAL_TRAINING_YEARS = 2
    TRAINING_DAYS_FIRST_TWO_YEARS = 10
    MIN_TRAINING_DAYS_PER_YEAR_AFTER = 1
    MAX_TRAINING_DAYS_PER_YEAR_AFTER = 2

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
      combined = "#{reason} #{action_by}".downcase
      return "district_judge" if combined.include?("dj") || combined.include?("district judge")
      return "magistrate" if combined.include?("magistrate") || combined.include?("vacated by magistrate")
      return "legal_admin" if action_by.present? && !combined.include?("magistrate")

      "other"
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
