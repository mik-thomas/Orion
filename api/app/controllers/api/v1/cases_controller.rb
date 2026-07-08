module Api
  module V1
    class CasesController < ApplicationController
      include JsonRenderable

      before_action :set_magistrate, only: %i[index create]
      before_action :set_case, only: %i[show update destroy]

      def index
        render json: @magistrate.cases.order(updated_at: :desc).map { |kase| case_json(kase) }
      end

      def show
        render json: case_detail_json(@case)
      end

      def create
        kase = @magistrate.cases.build(case_params)
        if kase.save
          render json: case_detail_json(kase), status: :created
        else
          render json: { errors: kase.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
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
        @case = Case.includes(:notes).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def case_params
        params.require(:case).permit(:reference, :title, :status)
      end
    end
  end
end
