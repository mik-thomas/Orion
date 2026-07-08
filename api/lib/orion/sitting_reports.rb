# frozen_string_literal: true

module Orion
  module SittingReports
    module_function

    def court_room_rows(scope)
      scope.joins(:courthouse)
        .group("courthouses.name", "sittings.court_room")
        .select(
          "courthouses.name AS courthouse_name",
          "sittings.court_room AS court_room",
          "COUNT(*) AS sittings",
          "COUNT(*) FILTER (WHERE sittings.status = 'completed') AS completed",
          "COUNT(*) FILTER (WHERE sittings.status = 'vacated') AS vacated",
          "COUNT(*) FILTER (WHERE sittings.status = 'cancelled') AS cancelled",
          "COUNT(*) FILTER (WHERE sittings.status = 'cancelled' AND sittings.cancellation_category = 'district_judge') AS cancelled_by_dj"
        )
        .order(Arel.sql("COUNT(*) DESC"))
        .map { |row| court_room_row_json(row) }
    end

    def count_rows(scope, group_expression, label_key)
      scope.group(group_expression).count
        .sort_by { |_, count| -count }
        .map { |label, count| { label_key => label.presence || "Unknown", "sittings" => count } }
    end

    def dj_cancellation_report
      dj_cancellation_report_for(Sitting.all)
    end

    def dj_cancellation_report_for(scope)
      cancelled_by_dj = scope.cancelled.where(cancellation_category: "district_judge")
      {
        "total" => cancelled_by_dj.count,
        "by_courthouse" => count_rows(cancelled_by_dj.joins(:courthouse), "courthouses.name", "courthouse"),
        "by_sitting_type" => count_rows(cancelled_by_dj.joins(:sitting_type), "sitting_types.name", "sitting_type"),
        "by_court_room" => court_room_rows(cancelled_by_dj)
      }
    end

    def court_room_row_json(row)
      {
        "courthouse" => row.courthouse_name,
        "court_room" => row.court_room.presence || "Unknown",
        "sittings" => row.sittings,
        "completed" => row.completed,
        "vacated" => row.vacated,
        "cancelled" => row.cancelled,
        "cancelled_by_dj" => row.cancelled_by_dj
      }
    end
  end
end
