# frozen_string_literal: true

module Orion
  module FiscalYear
    START_MONTH = 4
    START_DAY = 1

    PeriodFilter = Data.define(:period, :fiscal_year_label, :quarter, :start_date, :end_date) do
      def all_time?
        period == :all
      end

      def label
        return "All time" if all_time?
        return fiscal_year_label if quarter.nil?

        "#{fiscal_year_label} Q#{quarter}"
      end
    end

    module_function

    def fiscal_year_for(date)
      date = date.to_date
      date.month >= START_MONTH ? date.year : date.year - 1
    end

    def fiscal_quarter_for(date)
      case date.to_date.month
      when 4..6 then 1
      when 7..9 then 2
      when 10..12 then 3
      else 4
      end
    end

    def fiscal_year_label(start_year)
      "#{start_year}-#{format('%02d', (start_year + 1) % 100)}"
    end

    def fiscal_year_label_for(date)
      fiscal_year_label(fiscal_year_for(date))
    end

    def fiscal_year_dates(start_year)
      [
        Date.new(start_year, START_MONTH, START_DAY),
        Date.new(start_year + 1, 3, 31)
      ]
    end

    def fiscal_year_range(year_label)
      start_year = parse_year_label(year_label)
      fiscal_year_dates(start_year)
    end

    def current_fiscal_year(as_of: Date.current)
      fiscal_year_for(as_of)
    end

    def current_fiscal_quarter(as_of: Date.current)
      fiscal_quarter_for(as_of)
    end

    def current_fiscal_year_label(as_of: Date.current)
      fiscal_year_label(current_fiscal_year(as_of:))
    end

    def parse_year_label(year_label)
      match = year_label.to_s.strip.match(%r{\A(\d{4})[-/](\d{2})\z})
      raise ArgumentError, "Invalid fiscal year label: #{year_label}" unless match

      start_year = match[1].to_i
      end_suffix = match[2].to_i
      expected_suffix = (start_year + 1) % 100
      raise ArgumentError, "Invalid fiscal year label: #{year_label}" unless end_suffix == expected_suffix

      start_year
    end

    def parse_quarter(quarter_param)
      return nil if quarter_param.blank?

      match = quarter_param.to_s.strip.match(/\A(?:Q)?([1-4])\z/i)
      raise ArgumentError, "Invalid fiscal quarter: #{quarter_param}" unless match

      match[1].to_i
    end

    def fiscal_quarter_dates(start_year, quarter)
      case quarter
      when 1 then [Date.new(start_year, 4, 1), Date.new(start_year, 6, 30)]
      when 2 then [Date.new(start_year, 7, 1), Date.new(start_year, 9, 30)]
      when 3 then [Date.new(start_year, 10, 1), Date.new(start_year, 12, 31)]
      when 4 then [Date.new(start_year + 1, 1, 1), Date.new(start_year + 1, 3, 31)]
      else
        raise ArgumentError, "Invalid fiscal quarter: #{quarter}"
      end
    end

    def available_fiscal_year_labels(scope = Sitting)
      min_date = scope.minimum(:session_date)
      max_date = scope.maximum(:session_date)
      return [] unless min_date && max_date

      start_year = fiscal_year_for(min_date)
      end_year = fiscal_year_for(max_date)
      (start_year..end_year).map { |year| fiscal_year_label(year) }.reverse
    end

    def parse_period_params(params, as_of: Date.current)
      if params[:period].to_s.downcase == "all"
        return PeriodFilter.new(
          period: :all,
          fiscal_year_label: nil,
          quarter: nil,
          start_date: nil,
          end_date: nil
        )
      end

      if params[:fiscal_year].present?
        start_year = parse_year_label(params[:fiscal_year])
        quarter = parse_quarter(params[:quarter]) if params[:quarter].present?

        start_date, end_date = if quarter
                                 fiscal_quarter_dates(start_year, quarter)
                               else
                                 fiscal_year_dates(start_year)
                               end

        return PeriodFilter.new(
          period: :fiscal_year,
          fiscal_year_label: fiscal_year_label(start_year),
          quarter: quarter,
          start_date: start_date,
          end_date: end_date
        )
      end

      start_year = current_fiscal_year(as_of:)
      start_date, end_date = fiscal_year_dates(start_year)
      PeriodFilter.new(
        period: :fiscal_year,
        fiscal_year_label: fiscal_year_label(start_year),
        quarter: nil,
        start_date: start_date,
        end_date: end_date
      )
    end
  end
end
