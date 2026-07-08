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

    SHEFFIELD_AT_BARNSLEY_MIN_COUNT = 2
    SHEFFIELD_AT_BARNSLEY_MIN_PCT = 30

    def home_court_movement_report_for(scope)
      completed = scope.completed
        .joins(magistrate: :home_courthouse)
        .joins(:courthouse)
        .where.not(magistrates: { home_courthouse_id: nil })

      pair_counts = completed.group("courthouses.name", "courthouses_sittings.name").count
      courthouse_names = (Orion::Domain::LOCATIONS + pair_counts.keys.flatten).uniq.sort_by do |name|
        Orion::Domain::LOCATIONS.index(name) || Orion::Domain::LOCATIONS.length
      end

      magistrates_by_home = Magistrate.joins(:home_courthouse).group("courthouses.name").count
      home_court_names = (magistrates_by_home.keys + pair_counts.keys.map(&:first)).uniq.sort_by do |name|
        Orion::Domain::LOCATIONS.index(name) || Orion::Domain::LOCATIONS.length
      end

      by_home_court = home_court_names.map do |home_name|
        at_home = pair_counts[[home_name, home_name]] || 0
        away_total = pair_counts.sum do |(home, sitting), count|
          home == home_name && sitting != home_name ? count : 0
        end
        total = at_home + away_total

        {
          "home_courthouse" => home_name,
          "magistrates" => magistrates_by_home[home_name] || 0,
          "completed_at_home" => at_home,
          "completed_away" => away_total,
          "completed_total" => total,
          "away_pct" => total.positive? ? ((away_total.to_f / total) * 100).round(1) : 0.0
        }
      end

      matrix_rows = home_court_names.map do |home_name|
        cells = courthouse_names.index_with do |sitting_name|
          pair_counts[[home_name, sitting_name]] || 0
        end
        at_home = cells[home_name] || 0
        total = cells.values.sum

        {
          "home_courthouse" => home_name,
          "at_home" => at_home,
          "away" => total - at_home,
          "total" => total,
          "cells" => cells
        }
      end

      magistrate_completed = completed.group(:magistrate_id).count
      zero_completed = Magistrate.joins(:home_courthouse)
        .where(active: true)
        .where.not(id: magistrate_completed.keys)
        .includes(:home_courthouse)
        .order(:last_name, :first_name)
        .map do |magistrate|
          {
            "magistrate_id" => magistrate.id,
            "magistrate" => magistrate.full_name,
            "home_courthouse" => magistrate.home_courthouse.name
          }
        end

      sheffield_at_barnsley = sheffield_at_barnsley_flags(completed, magistrate_completed)

      totals_at_home = pair_counts.sum { |(home, sitting), count| home == sitting ? count : 0 }
      totals_away = pair_counts.sum { |(home, sitting), count| home != sitting ? count : 0 }
      total_completed = totals_at_home + totals_away

      {
        "summary" => {
          "total_completed_sittings" => total_completed,
          "completed_at_home" => totals_at_home,
          "completed_away" => totals_away,
          "away_pct" => total_completed.positive? ? ((totals_away.to_f / total_completed) * 100).round(1) : 0.0,
          "magistrates_with_home_court" => Magistrate.where.not(home_courthouse_id: nil).count,
          "magistrates_missing_home_court" => Magistrate.where(home_courthouse_id: nil).count
        },
        "courthouses" => courthouse_names,
        "by_home_court" => by_home_court,
        "matrix" => matrix_rows,
        "flags" => {
          "zero_completed_sittings" => zero_completed,
          "sheffield_at_barnsley" => sheffield_at_barnsley
        }
      }
    end

    def sheffield_at_barnsley_flags(completed_scope, magistrate_completed_counts)
      sheffield_home = completed_scope.where(courthouses: { name: "Sheffield" })

      barnsley_sittings = sheffield_home
        .where(courthouses_sittings: { name: "Barnsley" })
        .group(:magistrate_id)
        .count

      Magistrate.joins(:home_courthouse)
        .where(courthouses: { name: "Sheffield" })
        .where(id: barnsley_sittings.keys)
        .order(:last_name, :first_name)
        .filter_map do |magistrate|
          barnsley_count = barnsley_sittings[magistrate.id] || 0
          total = magistrate_completed_counts[magistrate.id] || 0
          next if barnsley_count.zero?

          pct = total.positive? ? ((barnsley_count.to_f / total) * 100).round(1) : 0.0
          next unless barnsley_count >= SHEFFIELD_AT_BARNSLEY_MIN_COUNT || pct >= SHEFFIELD_AT_BARNSLEY_MIN_PCT

          {
            "magistrate_id" => magistrate.id,
            "magistrate" => magistrate.full_name,
            "barnsley_sittings" => barnsley_count,
            "total_completed" => total,
            "barnsley_pct" => pct
          }
        end.sort_by { |row| -row["barnsley_sittings"] }
    end
  end
end
