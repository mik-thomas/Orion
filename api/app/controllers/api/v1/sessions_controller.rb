# frozen_string_literal: true

module Api
  module V1
    class SessionsController < ApplicationController
      # Login does not require an existing role header.
      def create
        user = Orion::DemoAuth.authenticate(params[:username], params[:password])
        unless user
          return render json: { error: "Enter a valid username and password" }, status: :unauthorized
        end

        render json: {
          token: Orion::DemoAuth.issue_token(user),
          username: user["username"],
          role: user["role"],
          display_name: user["display_name"].presence || user["username"]
        }, status: :created
      end

      def show
        payload = Orion::DemoAuth.verify_token(session_token)
        unless payload
          return render json: { error: "Not signed in" }, status: :unauthorized
        end

        render json: {
          username: payload["u"],
          role: payload["r"]
        }
      end

      def destroy
        head :no_content
      end

      private

      def session_token
        request.headers["X-Orion-Session"].presence || params[:token]
      end
    end
  end
end
