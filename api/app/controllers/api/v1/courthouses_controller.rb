module Api
  module V1
    class CourthousesController < ApplicationController
      include JsonRenderable

      def index
        courthouses = Courthouse.order(:name)
        render json: courthouses.map { |courthouse| courthouse_json(courthouse) }
      end
    end
  end
end
