# frozen_string_literal: true

module Orion
  module FiscalYear
    START_MONTH = 4
    START_DAY = 1

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
      match = year_label.to_s.strip.match(/\A(\d{4})[-/](\d{2})\z/)
      raise ArgumentError, "Invalid fiscal year label: #{year_label}" unless match

      start_year = match[1].to_i
      end_suffix = match[2].to_i
      expected_suffix = (start_year + 1) % 100
      raise ArgumentError, "Invalid fiscal year label: #{year_label}" unless end_suffix == expected_suffix

      start_year
    end
  end
end
