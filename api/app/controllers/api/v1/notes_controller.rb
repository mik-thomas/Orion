# frozen_string_literal: true

module Api
  module V1
    class NotesController < ApplicationController
      include JsonRenderable

      before_action :set_case, only: %i[index create]
      before_action :set_note_for_nested_destroy, only: %i[destroy], if: -> { params[:case_id].present? }
      before_action :set_note, only: %i[show update destroy], if: -> { params[:case_id].blank? }

      def index
        render json: @case.notes.chronological.map { |note| note_json(note) }
      end

      def show
        render json: note_json(@note)
      end

      def create
        note = @case.notes.build(note_params)
        note.created_by = current_user
        note.updated_by = current_user
        note.author_name = note.author_name.presence || current_user&.display_name
        if note.save
          render json: note_json(note), status: :created
        else
          render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        @note.updated_by = current_user
        attrs = note_params.to_h.symbolize_keys
        if attrs[:author_name].blank? && @note.author_name.blank? && current_user
          attrs[:author_name] = current_user.display_name
        end
        if @note.update(attrs)
          render json: note_json(@note)
        else
          render json: { errors: @note.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @note.destroy!
        head :no_content
      end

      private

      def set_case
        @case = Case.find_by_id_or_public_id!(params[:case_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def set_note
        @note = Note.includes(case: :magistrate, created_by: {}, updated_by: {}).find_by_id_or_public_id!(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def set_note_for_nested_destroy
        @case = Case.find_by_id_or_public_id!(params[:case_id])
        @note = @case.notes.find_by_id_or_public_id!(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def note_params
        params.require(:note).permit(:body, :author_name, :occurred_at)
      end
    end
  end
end
