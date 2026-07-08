module Api
  module V1
    class SittingsController < ApplicationController
      include JsonRenderable

      def index
        sittings = Sitting.includes(:magistrate, :courthouse, :sitting_type).ordered
        sittings = sittings.where(magistrate_id: params[:magistrate_id]) if params[:magistrate_id].present?
        sittings = sittings.where(courthouse_id: params[:courthouse_id]) if params[:courthouse_id].present?
        sittings = sittings.where(sitting_type_id: params[:sitting_type_id]) if params[:sitting_type_id].present?
        sittings = sittings.where(vacated: true) if params[:vacated] == "1"
        sittings = sittings.where(vacated: false) if params[:vacated] == "0"

        render json: sittings.map { |sitting| sitting_json(sitting) }
      end
    end
  end
end
