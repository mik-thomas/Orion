# frozen_string_literal: true

module Api
  module V1
    class TasksController < ApplicationController
      include JsonRenderable

      before_action :require_task_access!
      before_action :set_task, only: %i[show update destroy]

      def index
        render json: {
          tasks: scoped_tasks.includes(:created_by, :assigned_to).ordered.map { |task| task_json(task) },
          summary: task_summary_json(base_scope)
        }
      end

      def summary
        render json: task_summary_json(base_scope)
      end

      def show
        render json: task_json(@task)
      end

      def create
        unless current_user&.can_manage_tasks?
          return render json: { error: "Only Bench Chair or Developer can create tasks" }, status: :forbidden
        end

        task = Task.new(create_params)
        task.created_by = current_user
        task.assigned_to ||= default_deputy

        if task.assigned_to.nil?
          return render json: { errors: ["No Deputy user available to assign"] }, status: :unprocessable_entity
        end

        if task.save
          render json: task_json(task), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        unless can_update_task?(@task)
          return render json: { error: "Not authorised to update this task" }, status: :forbidden
        end

        attrs = update_params_for(@task)
        if @task.update(attrs)
          render json: task_json(@task)
        else
          render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        unless current_user&.can_manage_tasks?
          return render json: { error: "Only Bench Chair or Developer can cancel tasks" }, status: :forbidden
        end

        @task.update!(status: "cancelled")
        render json: task_json(@task)
      end

      private

      def require_task_access!
        return if current_user

        render json: { error: "Sign in required" }, status: :unauthorized
      end

      def set_task
        @task = Task.includes(:created_by, :assigned_to).find(params[:id])
        return if can_view_task?(@task)

        render json: { error: "Not found" }, status: :not_found
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
      end

      def base_scope
        scope = Task.all
        return scope if current_user.developer? || current_user.bench_chair? || current_user.role == "hmcts_slm"

        scope.where(assigned_to_id: current_user.id)
      end

      def scoped_tasks
        scope = base_scope
        scope = scope.with_status(params[:status]) if params[:status].present?
        scope = scope.assigned_to_user(params[:assigned_to_user_id]) if params[:assigned_to_user_id].present?
        scope = scope.overdue if ActiveModel::Type::Boolean.new.cast(params[:overdue])

        if params[:completed_from].present? || params[:completed_to].present?
          from_date = parse_date(params[:completed_from])
          to_date = parse_date(params[:completed_to])
          scope = scope.completed_between(from_date, to_date)
        end

        scope
      end

      def can_view_task?(task)
        return true if current_user.developer? || current_user.bench_chair? || current_user.role == "hmcts_slm"

        task.assigned_to_id == current_user.id
      end

      def can_update_task?(task)
        return true if current_user.developer? || current_user.bench_chair?
        return true if current_user.deputy? && task.assigned_to_id == current_user.id

        false
      end

      def create_params
        remap_assignee(
          params.require(:task).permit(:title, :description, :status, :priority, :due_on, :assigned_to_user_id, :report_notes)
        )
      end

      def update_params_for(_task)
        permitted =
          if current_user.developer? || current_user.bench_chair?
            params.require(:task).permit(
              :title, :description, :status, :priority, :due_on, :assigned_to_user_id, :report_notes
            )
          else
            params.require(:task).permit(:status, :report_notes)
          end

        remap_assignee(permitted)
      end

      def remap_assignee(permitted)
        attrs = permitted.to_h.symbolize_keys
        if attrs.key?(:assigned_to_user_id)
          attrs[:assigned_to_id] = attrs.delete(:assigned_to_user_id)
        end
        attrs
      end

      def default_deputy
        User.find_by(role: "deputy")
      end

      def parse_date(value)
        return nil if value.blank?

        Date.parse(value.to_s)
      rescue ArgumentError
        nil
      end
    end
  end
end
