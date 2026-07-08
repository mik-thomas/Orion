module Api
  module V1
    class SittingTypesController < ApplicationController
      include JsonRenderable

      def index
        sitting_types = SittingType.order(:name)
        render json: sitting_types.map { |sitting_type| sitting_type_json(sitting_type) }
      end
    end
  end
end
