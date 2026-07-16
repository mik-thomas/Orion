# frozen_string_literal: true

module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :authenticate_request!, only: :create
      skip_before_action :set_current_role, only: :create

      def create
        user = Orion::Auth.authenticate(params[:username], params[:password])
        unless user
          return render json: { error: "Enter a valid username and password" }, status: :unauthorized
        end

        raw_token, = Orion::Auth.issue_session!(user)
        render json: session_json(user, token: raw_token), status: :created
      end

      def show
        render json: session_json(current_user)
      end

      def destroy
        Orion::Auth.destroy_session!(session_token)
        head :no_content
      end

      private

      def session_json(user, token: nil)
        payload = {
          username: user.username,
          role: user.role_label,
          display_name: user.display_name
        }
        payload[:token] = token if token
        payload
      end
    end
  end
end
