module Api
  module V1
    class ReportsController < ApplicationController
      include JsonRenderable

      def overview
        render json: {
          summary: {
            magistrates: Magistrate.count,
            active_magistrates: Magistrate.where(active: true).count,
            courthouses: Courthouse.count,
            sittings: Sitting.count,
            completed_sittings: Sitting.completed.count,
            vacated_sittings: Sitting.vacated.count,
            cancelled_sittings: Sitting.cancelled.count,
            sitting_types: SittingType.count
          },
          by_courthouse: courthouse_sitting_counts,
          by_court_type: court_type_counts,
          away_from_home: away_from_home_counts,
          by_sitting_type: sitting_type_counts,
          note: "South Yorkshire import: completed, vacated and cancelled sittings from April 2025 to March 2026."
        }
      end

      private

      def courthouse_sitting_counts
        Sitting.joins(:courthouse).group("courthouses.name").count
          .sort_by { |_, count| -count }
          .map { |name, count| { courthouse: name, sittings: count } }
      end

      def away_from_home_counts
        Sitting.completed.includes(:magistrate, :courthouse).find_each.with_object({}) do |sitting, counts|
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

      def sitting_type_counts
        Sitting.joins(:sitting_type).group("sitting_types.name").count
          .sort_by { |_, count| -count }
          .map { |name, count| { sitting_type: name, sittings: count } }
      end

      def court_type_counts
        Sitting.group(:court_type).count
          .sort_by { |_, count| -count }
          .map { |name, count| { court_type: name || "Unknown", sittings: count } }
      end
    end
  end
end
