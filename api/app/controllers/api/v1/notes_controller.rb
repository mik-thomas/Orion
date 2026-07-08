module Api
  module V1
    class NotesController < ApplicationController
      include JsonRenderable

      before_action :set_case

      def index
        render json: @case.notes.order(created_at: :desc).map { |note| note_json(note) }
      end

      def create
        note = @case.notes.build(note_params)
        if note.save
          render json: note_json(note), status: :created
        else
          render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        note = @case.notes.find(params[:id])
        note.destroy!
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      private

      def set_case
        @case = Case.find(params[:case_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def note_params
        params.require(:note).permit(:body, :author_name)
      end
    end
  end
end
