module Api
  module V1
    class StatusController < ActionController::API
      def show
        render json: { name: "orion", version: "0.1.0" }
      end
    end
  end
end
