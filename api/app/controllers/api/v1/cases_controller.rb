# frozen_string_literal: true

module Api
  module V1
    class CasesController < ApplicationController
      include JsonRenderable

      before_action :set_magistrate, only: %i[index create]
      before_action :set_case, only: %i[show update destroy]

      def index
        render json: @magistrate.cases.ordered.map { |kase| case_json(kase) }
      end

      def show
        render json: case_detail_json(@case)
      end

      def create
        kase = @magistrate.cases.build(case_params)
        kase.created_by = current_user
        kase.updated_by = current_user
        if kase.save
          render json: case_detail_json(kase), status: :created
        else
          render json: { errors: kase.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        @case.updated_by = current_user
        if @case.update(case_params)
          render json: case_detail_json(@case)
        else
          render json: { errors: @case.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @case.destroy!
        head :no_content
      end

      private

      def set_magistrate
        @magistrate = Magistrate.find(params[:magistrate_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def set_case
        @case = Case.includes(:notes, :tasks, :created_by, :updated_by, :magistrate)
          .find_by_id_or_public_id!(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def case_params
        params.require(:case).permit(:reference, :title, :status, :summary, :case_type)
      end
    end
  end
end
