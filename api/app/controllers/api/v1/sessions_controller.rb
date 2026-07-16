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
        @current_user = user
        @current_role = user.role_label
        render json: session_json(user, token: raw_token), status: :created
      end

      def show
        unless current_user
          return render json: { error: "Not signed in" }, status: :unauthorized
        end

        render json: session_json(current_user)
      end

      def destroy
        Orion::Auth.destroy_session!(session_token)
        head :no_content
      end

      private

      def session_json(user, token: nil)
        # Prefer dual-gated controller helpers when available (GET session / preview).
        sees_real = if respond_to?(:real_pii?, true) && current_user
                      real_pii?
                    else
                      Orion::Role.real_pii?(user.role_label)
                    end
        payload = {
          username: user.username,
          role: user.role_label,
          display_name: user.display_name,
          real_pii: sees_real,
          pii_anonymized: !sees_real,
          names_visible: sees_real,
          roster_access: sees_real,
          pii_roles: Orion::Role.pii_roles.map { |slug| Orion::Role.label_for(slug) }.uniq
        }
        payload[:token] = token if token
        payload
      end
    end
  end
end
