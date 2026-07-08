module Api
  module V1
    class MagistratesController < ApplicationController
      include JsonRenderable

      before_action :set_magistrate, only: %i[show update destroy]

      def index
        magistrates = Magistrate.includes(:home_courthouse, :leaves_of_absence, :sitting_locations)
          .order(:last_name, :first_name)
        magistrates = apply_search(magistrates, params[:q])
        render json: magistrates.map { |magistrate| magistrate_summary_json(magistrate) }
      end

      def show
        render json: magistrate_detail_json(@magistrate)
      end

      def create
        magistrate = Magistrate.new(magistrate_params)
        if magistrate.save
          sync_sitting_locations!(magistrate)
          render json: magistrate_detail_json(magistrate.reload), status: :created
        else
          render json: { errors: magistrate.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @magistrate.update(magistrate_params)
          sync_sitting_locations!(@magistrate)
          render json: magistrate_detail_json(@magistrate.reload)
        else
          render json: { errors: @magistrate.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @magistrate.destroy!
        head :no_content
      end

      private

      def set_magistrate
        @magistrate = Magistrate.includes(
          :home_courthouse, :sitting_locations, :leaves_of_absence, :cases,
          sittings: %i[courthouse sitting_type magistrate]
        ).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def magistrate_params
        params.require(:magistrate).permit(
          :first_name, :last_name, :email, :date_of_appointment, :home_courthouse_id, :reasonable_adjustments
        )
      end

      def sync_sitting_locations!(magistrate)
        ids = Array(params.dig(:magistrate, :sitting_location_ids)).map(&:presence).compact.map(&:to_i)
        return unless params[:magistrate].key?(:sitting_location_ids)

        magistrate.magistrate_sitting_locations.where.not(courthouse_id: ids).destroy_all
        ids.each do |courthouse_id|
          magistrate.magistrate_sitting_locations.find_or_create_by!(courthouse_id: courthouse_id)
        end
      end

      def apply_search(scope, query)
        q = query.to_s.strip
        return scope if q.blank?

        pattern = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
        courthouse_ids = Courthouse.where("name ILIKE :q OR cluster ILIKE :q OR bench ILIKE :q", q: pattern).pluck(:id)
        sitting_magistrate_ids = Magistrate.joins(:magistrate_sitting_locations)
          .where(magistrate_sitting_locations: { courthouse_id: courthouse_ids })
          .pluck(:id)

        scope.where(
          "magistrates.first_name ILIKE :q OR magistrates.last_name ILIKE :q OR magistrates.email ILIKE :q " \
          "OR magistrates.home_courthouse_id IN (:court_ids) OR magistrates.id IN (:magistrate_ids)",
          q: pattern,
          court_ids: courthouse_ids.presence || [0],
          magistrate_ids: sitting_magistrate_ids.presence || [0]
        )
      end
    end
  end
end
