# frozen_string_literal: true

module PeriodFilterable
  extend ActiveSupport::Concern

  private

  def validate_period_filter!
    period_filter
  rescue ArgumentError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def period_filter
    @period_filter ||= Orion::FiscalYear.parse_period_params(params)
  end

  def filtered_sittings(scope = Sitting)
    filter = period_filter
    return scope if filter.all_time?

    scope.where(session_date: filter.start_date..filter.end_date)
  end

  def period_filter_json
    filter = period_filter
    {
      mode: filter.all_time? ? "all" : "fiscal_year",
      fiscal_year: filter.fiscal_year_label,
      quarter: filter.quarter ? "Q#{filter.quarter}" : nil,
      label: filter.label,
      start_date: filter.start_date,
      end_date: filter.end_date
    }
  end

  def available_fiscal_years_json
    Orion::FiscalYear.available_fiscal_year_labels
  end
end
