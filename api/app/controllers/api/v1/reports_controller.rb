module Api
  module V1
    class ReportsController < ApplicationController
      include JsonRenderable

      def overview
        render json: {
          summary: {
            magistrates: Magistrate.count,
            courthouses: Courthouse.count,
            sittings: Sitting.count,
            vacated_sittings: Sitting.vacated.count,
            sitting_types: SittingType.count
          },
          by_courthouse: courthouse_sitting_counts,
          away_from_home: away_from_home_counts,
          by_sitting_type: sitting_type_counts,
          note: "Detailed sitting imports and borough movement reports will be added when data is available."
        }
      end

      private

      def courthouse_sitting_counts
        Sitting.joins(:courthouse).group("courthouses.name").count
          .sort_by { |_, count| -count }
          .map { |name, count| { courthouse: name, sittings: count } }
      end

      def away_from_home_counts
        Sitting.includes(:magistrate, :courthouse).find_each.with_object(Hash.new(0)) do |sitting, counts|
          next if sitting.magistrate.home_courthouse_id.nil?
          next unless sitting.courthouse_id != sitting.magistrate.home_courthouse_id

          key = sitting.magistrate.full_name
          counts[key] += 1
        end.map { |magistrate, count| { magistrate:, away_sittings: count } }.sort_by { |row| -row[:away_sittings] }
      end

      def sitting_type_counts
        Sitting.joins(:sitting_type).group("sitting_types.name").count
          .sort_by { |_, count| -count }
          .map { |name, count| { sitting_type: name, sittings: count } }
      end
    end
  end
end
