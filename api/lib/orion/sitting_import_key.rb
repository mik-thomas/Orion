# frozen_string_literal: true

require "digest"

module Orion
  module SittingImportKey
    PARTS = %i[
      magistrate_email session_date session courthouse_name venue_name
      sitting_type_name panel position
    ].freeze

    STATUS_PRIORITY = {
      "completed" => 3,
      "vacated" => 2,
      "cancelled" => 1
    }.freeze

    module_function

    def build(magistrate_email:, session_date:, session:, courthouse_name:, venue_name:,
              sitting_type_name:, panel:, position:)
      digest([
        magistrate_email,
        session_date,
        session,
        courthouse_name,
        venue_name,
        sitting_type_name,
        panel,
        position
      ])
    end

    def from_sitting(sitting)
      sitting = sitting.reload if sitting.association(:magistrate).loaded? == false
      build(
        magistrate_email: sitting.magistrate&.email,
        session_date: sitting.session_date,
        session: sitting.session,
        courthouse_name: sitting.courthouse&.name,
        venue_name: sitting.venue_name,
        sitting_type_name: sitting.sitting_type&.name,
        panel: sitting.panel,
        position: sitting.position
      )
    end

    def status_priority(status)
      STATUS_PRIORITY.fetch(status.to_s, 0)
    end

    def digest(parts)
      Digest::SHA256.hexdigest(parts.map { |p| p.to_s.strip.downcase }.join("|"))
    end
  end
end
