module Api
  module V1
    class ReportsController < ApplicationController
      include JsonRenderable

      def overview
        as_of = Date.current
        fiscal_year_start = Orion::FiscalYear.current_fiscal_year(as_of:)
        fiscal_year_start_date, fiscal_year_end_date = Orion::FiscalYear.fiscal_year_dates(fiscal_year_start)
        fiscal_sittings = Sitting.where(session_date: fiscal_year_start_date..fiscal_year_end_date)

        render json: {
          fiscal_year: {
            label: Orion::FiscalYear.fiscal_year_label(fiscal_year_start),
            quarter: Orion::FiscalYear.current_fiscal_quarter(as_of:),
            start_date: fiscal_year_start_date,
            end_date: fiscal_year_end_date
          },
          summary: {
            magistrates: Magistrate.count,
            active_magistrates: Magistrate.where(active: true).count,
            courthouses: Courthouse.count,
            sittings: fiscal_sittings.count,
            completed_sittings: fiscal_sittings.completed.count,
            vacated_sittings: fiscal_sittings.vacated.count,
            cancelled_sittings: fiscal_sittings.cancelled.count,
            cancelled_by_dj: fiscal_sittings.cancelled.where(cancellation_category: "district_judge").count,
            sitting_types: SittingType.count
          },
          by_courthouse: courthouse_sitting_counts(fiscal_sittings),
          by_court_type: court_type_counts(fiscal_sittings),
          by_court_room: Orion::SittingReports.court_room_rows(fiscal_sittings),
          away_from_home: away_from_home_counts(fiscal_sittings),
          by_sitting_type: sitting_type_counts(fiscal_sittings),
          dj_cancellations: Orion::SittingReports.dj_cancellation_report_for(fiscal_sittings),
          login_report: login_report_rows,
          note: "South Yorkshire import: completed, vacated and cancelled sittings from April 2025 to March 2026 (fiscal year #{Orion::FiscalYear.fiscal_year_label(fiscal_year_start)})."
        }
      end

      private

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
            magistrate: sitting.magistrate.full_name,
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

      def login_report_rows
        Magistrate.where.not(last_login_on: nil)
          .order(days_since_login: :desc, last_login_on: :asc)
          .map do |magistrate|
            {
              magistrate_id: magistrate.id,
              magistrate: magistrate.full_name,
              last_login_on: magistrate.last_login_on,
              days_since_login: magistrate.days_since_login
            }
          end
      end
    end
  end
end
