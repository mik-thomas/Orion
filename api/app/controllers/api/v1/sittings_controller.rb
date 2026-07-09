module Api
  module V1
    class SittingsController < ApplicationController
      include JsonRenderable
      include PeriodFilterable

      before_action :validate_period_filter!, only: :drill_down

      def index
        sittings = Sitting.includes(:magistrate, :courthouse, :sitting_type).ordered
        sittings = sittings.where(magistrate_id: params[:magistrate_id]) if params[:magistrate_id].present?
        sittings = sittings.where(courthouse_id: params[:courthouse_id]) if params[:courthouse_id].present?
        sittings = sittings.where(sitting_type_id: params[:sitting_type_id]) if params[:sitting_type_id].present?
        sittings = sittings.where(status: "vacated") if params[:vacated] == "1"
        sittings = sittings.where(status: "completed") if params[:vacated] == "0"
        sittings = sittings.where(status: params[:status]) if params[:status].present?

        render json: sittings.map { |sitting| sitting_json(sitting) }
      end

      def drill_down
        sittings = apply_drill_down_filters(filtered_sittings(Sitting.includes(:magistrate, :courthouse, :sitting_type)))
        page = [params[:page].to_i, 1].max
        per_page = params[:per_page].present? ? [[params[:per_page].to_i, 1].max, 100].min : 50
        total_count = sittings.count
        total_pages = total_count.positive? ? (total_count.to_f / per_page).ceil : 0
        rows = sittings.ordered.offset((page - 1) * per_page).limit(per_page)

        render json: {
          period: period_filter_json,
          available_fiscal_years: available_fiscal_years_json,
          filters: drill_down_filters_json,
          pagination: {
            page: page,
            per_page: per_page,
            total_count: total_count,
            total_pages: total_pages
          },
          sittings: rows.map { |sitting| drill_down_sitting_json(sitting) }
        }
      end

      private

      def apply_drill_down_filters(scope)
        sittings = scope
        sittings = sittings.where(magistrate_id: params[:magistrate_id]) if params[:magistrate_id].present?

        if params[:courthouse_id].present?
          sittings = sittings.where(courthouse_id: params[:courthouse_id])
        elsif params[:courthouse].present?
          sittings = sittings.joins(:courthouse).where(courthouses: { name: params[:courthouse] })
        end

        if params[:sitting_type_id].present?
          sittings = sittings.where(sitting_type_id: params[:sitting_type_id])
        elsif params[:sitting_type].present?
          sittings = sittings.joins(:sitting_type).where(sitting_types: { name: params[:sitting_type] })
        end

        if params[:court_type].present?
          court_type = params[:court_type] == "Unknown" ? nil : params[:court_type]
          sittings = sittings.where(court_type: court_type)
        end

        sittings = sittings.where(court_room: params[:court_room]) if params[:court_room].present?
        sittings = sittings.where(status: params[:status]) if params[:status].present?
        sittings = sittings.where(cancellation_category: params[:cancellation_category]) if params[:cancellation_category].present?
        sittings = apply_away_from_home_filter(sittings) if params[:away_from_home] == "1"

        sittings
      end

      def apply_away_from_home_filter(scope)
        scope.completed
          .joins(:magistrate)
          .where.not(magistrates: { home_courthouse_id: nil })
          .where("sittings.courthouse_id != magistrates.home_courthouse_id")
      end

      def drill_down_filters_json
        {
          status: params[:status],
          cancellation_category: params[:cancellation_category],
          courthouse: params[:courthouse],
          courthouse_id: params[:courthouse_id]&.to_i,
          court_type: params[:court_type],
          court_room: params[:court_room],
          sitting_type: params[:sitting_type],
          sitting_type_id: params[:sitting_type_id]&.to_i,
          magistrate_id: params[:magistrate_id]&.to_i,
          away_from_home: params[:away_from_home] == "1"
        }.compact
      end

      def drill_down_sitting_json(sitting)
        {
          "id" => sitting.id,
          "magistrate_id" => sitting.magistrate_id,
          "session_date" => sitting.session_date,
          "session" => sitting.session,
          "display_name" => magistrate_display_name(sitting.magistrate),
          "courthouse" => sitting.courthouse.name,
          "court_room" => sitting.court_room,
          "court_type" => sitting.court_type,
          "sitting_type" => sitting.sitting_type.name,
          "status" => sitting.status,
          "cancellation_category" => sitting.cancellation_category,
          "away_from_home" => sitting.magistrate.home_courthouse_id.present? &&
            sitting.courthouse_id != sitting.magistrate.home_courthouse_id
        }
      end
    end
  end
end
