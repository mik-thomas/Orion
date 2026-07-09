module Api
  module V1
    class ReportsController < ApplicationController
      include JsonRenderable
      include PeriodFilterable

      before_action :validate_period_filter!, only: :overview

      def overview
        filter = period_filter
        scoped_sittings = filtered_sittings

        render json: {
          period: period_filter_json,
          available_fiscal_years: available_fiscal_years_json,
          fiscal_year: fiscal_year_context_json(filter),
          summary: {
            magistrates: Magistrate.count,
            active_magistrates: Magistrate.where(active: true).count,
            courthouses: Courthouse.count,
            sittings: scoped_sittings.count,
            completed_sittings: scoped_sittings.completed.count,
            vacated_sittings: scoped_sittings.vacated.count,
            cancelled_sittings: scoped_sittings.cancelled.count,
            cancelled_by_dj: scoped_sittings.cancelled.where(cancellation_category: "district_judge").count,
            cancelled_by_hmcts: scoped_sittings.cancelled.where(cancellation_category: "hmcts").count,
            cancelled_by_magistrate: scoped_sittings.cancelled.where(cancellation_category: "magistrate").count,
            sitting_types: SittingType.count
          },
          by_courthouse: courthouse_sitting_counts(scoped_sittings),
          by_court_type: court_type_counts(scoped_sittings),
          by_court_room: Orion::SittingReports.court_room_rows(scoped_sittings),
          away_from_home: away_from_home_counts(scoped_sittings),
          by_sitting_type: sitting_type_counts(scoped_sittings),
          dj_cancellations: Orion::SittingReports.dj_cancellation_report_for(scoped_sittings),
          home_court_movement: Orion::SittingReports.home_court_movement_report_for(scoped_sittings, role: current_role),
          login_report: login_report_rows,
          commitment_forecast: commitment_forecast_rows,
          note: overview_note(filter)
        }
      end

      private

      def fiscal_year_context_json(filter)
        return nil if filter.all_time?

        {
          label: filter.fiscal_year_label,
          quarter: filter.quarter,
          start_date: filter.start_date,
          end_date: filter.end_date
        }
      end

      def overview_note(filter)
        if filter.all_time?
          "All imported sitting data (no date filter)."
        elsif filter.quarter
          "Sittings from #{filter.start_date} to #{filter.end_date} (#{filter.label})."
        else
          "Sittings for fiscal year #{filter.fiscal_year_label} (#{filter.start_date} to #{filter.end_date})."
        end
      end

      def courthouse_sitting_counts(scope)
        scope.joins(:courthouse).group("courthouses.name").count
          .sort_by { |_, count| -count }
          .map { |name, count| { courthouse: name, sittings: count } }
      end

      def away_from_home_counts(scope)
        scope.completed.includes(:magistrate, :courthouse).find_each.with_object({}) do |sitting, counts|
          next if sitting.magistrate.home_courthouse_id.nil?
          next unless sitting.courthouse_id != sitting.magistrate.home_courthouse_id

          entry = counts[sitting.magistrate_id] ||= {
            magistrate_id: sitting.magistrate_id,
            magistrate: magistrate_display_name(sitting.magistrate),
            away_sittings: 0
          }
          entry[:away_sittings] += 1
        end.values.sort_by { |row| -row[:away_sittings] }.first(25)
      end

      def sitting_type_counts(scope)
        scope.joins(:sitting_type).group("sitting_types.name").count
          .sort_by { |_, count| -count }
          .map { |name, count| { sitting_type: name, sittings: count } }
      end

      def court_type_counts(scope)
        scope.group(:court_type).count
          .sort_by { |_, count| -count }
          .map { |name, count| { court_type: name || "Unknown", sittings: count } }
      end

      def commitment_forecast_rows
        forecasts = Orion::SittingForecaster.at_risk_forecasts
        magistrates = Magistrate.where(id: forecasts.map { |row| row["magistrate_id"] }).index_by(&:id)

        forecasts.map do |row|
          magistrate = magistrates.fetch(row["magistrate_id"])
          row.merge("display_name" => magistrate_display_name(magistrate))
        end
      end

      def login_report_rows
        Magistrate.where.not(last_login_on: nil)
          .order(days_since_login: :desc, last_login_on: :asc)
          .map do |magistrate|
            {
              magistrate_id: magistrate.id,
              magistrate: magistrate_display_name(magistrate),
              last_login_on: magistrate.last_login_on,
              days_since_login: magistrate.days_since_login
            }
          end
      end
    end
  end
end
