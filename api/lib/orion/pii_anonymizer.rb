# frozen_string_literal: true

require "digest"

module Orion
  # Stable, deterministic fake identity for a magistrate id.
  # Same id always yields the same fake name / code / email so demos stay coherent
  # without exposing real PII in API JSON.
  module PiiAnonymizer
    FIRST_NAMES = %w[
      Alex Jordan Sam Riley Casey Morgan Avery Quinn Parker Cameron
      Taylor Jamie Reese Drew Blair Rowan Hayden Emerson Finley Sage
      Harper Ellis Kai Noah Luca Mira Elena Hugo Isla Nora
    ].freeze

    LAST_NAMES = %w[
      Hart Blake Reed Stone Hale Quinn Brooks Fletcher Langley Mercer
      Whitaker Carver Dalton Prescott Ellison Harlow Kenway Ashford
      Barrett Collins Foster Graham Hughes Jenkins Lambert Norris
    ].freeze

    module_function

    def for_magistrate(magistrate)
      id = magistrate.respond_to?(:id) ? magistrate.id : magistrate
      seed = Digest::SHA256.digest("orion-pii-v1:#{id}")
      first = FIRST_NAMES[byte_at(seed, 0) % FIRST_NAMES.length]
      last = LAST_NAMES[byte_at(seed, 1) % LAST_NAMES.length]
      code_suffix = seed[2, 3].unpack1("H*")[0, 4].upcase
      {
        "first_name" => first,
        "last_name" => last,
        "full_name" => "#{first} #{last}",
        "display_name" => "#{first} #{last}",
        "reference_code" => "DEMO-#{code_suffix}",
        "email" => "#{first.downcase}.#{last.downcase}.#{id}@demo.orion.local"
      }
    end

    def byte_at(seed, index)
      seed.getbyte(index) || 0
    end
    private_class_method :byte_at
  end
end
