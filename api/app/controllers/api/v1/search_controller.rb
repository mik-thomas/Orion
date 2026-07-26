# frozen_string_literal: true

module Api
  module V1
    class SearchController < ApplicationController
      include JsonRenderable

      def index
        q = params[:q].to_s.strip
        if q.blank?
          return render json: { results: [] }
        end

        render json: { results: search_results(q) }
      end

      private

      def search_results(query)
        results = []
        results.concat(search_magistrates(query))
        results.concat(search_cases(query))
        results.concat(search_notes(query))
        results.first(50)
      end

      def search_magistrates(query)
        apply_magistrate_search(Magistrate.includes(:home_courthouse), query).limit(20).map do |magistrate|
          identity = magistrate_identity_fields(magistrate)
          {
            "type" => "magistrate",
            "id" => magistrate.id,
            "public_id" => identity["reference_code"],
            "title" => identity["display_name"],
            "display_name" => identity["display_name"],
            "subtitle" => magistrate.home_courthouse&.name,
            "path_hint" => "/magistrates/#{magistrate.id}"
          }
        end
      end

      def search_cases(query)
        Case.search(query).includes(:magistrate).limit(20).map do |kase|
          {
            "type" => "case",
            "id" => kase.id,
            "public_id" => kase.public_id,
            "title" => kase.title,
            "display_name" => kase.title,
            "subtitle" => [kase.public_id, kase.reference, magistrate_display_name(kase.magistrate)].compact.join(" · "),
            "path_hint" => "/cases/#{kase.public_id || kase.id}"
          }
        end
      end

      def search_notes(query)
        Note.search(query).includes(case: :magistrate).limit(20).map do |note|
          kase = note.case
          {
            "type" => "note",
            "id" => note.id,
            "public_id" => note.public_id,
            "title" => note.body.to_s.truncate(80),
            "display_name" => note.body.to_s.truncate(80),
            "subtitle" => [note.public_id, kase&.public_id, kase && magistrate_display_name(kase.magistrate)].compact.join(" · "),
            "path_hint" => "/notes/#{note.public_id || note.id}"
          }
        end
      end

      # Mirrors MagistratesController#apply_search — real PII roles can search names/codes;
      # others only match courthouse/sitting location (anonymiser-safe).
      def apply_magistrate_search(scope, query)
        pattern = "%#{ActiveRecord::Base.sanitize_sql_like(query)}%"
        courthouse_ids = Courthouse.where("name ILIKE :q OR cluster ILIKE :q OR bench ILIKE :q", q: pattern).pluck(:id)
        sitting_magistrate_ids = Magistrate.joins(:magistrate_sitting_locations)
          .where(magistrate_sitting_locations: { courthouse_id: courthouse_ids })
          .pluck(:id)

        if real_pii?
          return scope.where(
            "magistrates.first_name ILIKE :q OR magistrates.last_name ILIKE :q OR magistrates.email ILIKE :q OR " \
            "magistrates.reference_code ILIKE :q OR magistrates.home_courthouse_id IN (:court_ids) OR " \
            "magistrates.id IN (:magistrate_ids)",
            q: pattern,
            court_ids: courthouse_ids.presence || [0],
            magistrate_ids: sitting_magistrate_ids.presence || [0]
          )
        end

        scope.where(
          "magistrates.home_courthouse_id IN (:court_ids) OR magistrates.id IN (:magistrate_ids)",
          court_ids: courthouse_ids.presence || [0],
          magistrate_ids: sitting_magistrate_ids.presence || [0]
        )
      end
    end
  end
end
