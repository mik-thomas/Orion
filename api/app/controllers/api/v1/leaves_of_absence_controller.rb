module Api
  module V1
    class LeavesOfAbsenceController < ApplicationController
      include JsonRenderable

      before_action :set_magistrate
      before_action :set_leave, only: %i[update destroy]

      def index
        render json: @magistrate.leaves_of_absence.ordered.map { |leave| leave_json(leave) }
      end

      def create
        leave = @magistrate.leaves_of_absence.build(leave_params)
        if leave.save
          render json: leave_json(leave), status: :created
        else
          render json: { errors: leave.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @leave.update(leave_params)
          render json: leave_json(@leave)
        else
          render json: { errors: @leave.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @leave.destroy!
        head :no_content
      end

      private

      def set_magistrate
        @magistrate = Magistrate.find(params[:magistrate_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def set_leave
        @leave = @magistrate.leaves_of_absence.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def leave_params
        params.require(:leave_of_absence).permit(:starts_on, :ends_on, :reason, :notes)
      end
    end
  end
end
