import type { SittingForecast } from "../types/domain";

interface SittingForecastPanelProps {
  forecast: SittingForecast | null;
}

function formatFullDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function riskTagClass(riskLevel: SittingForecast["risk_level"]) {
  switch (riskLevel) {
    case "on_track":
      return "govuk-tag--green";
    case "at_risk":
      return "govuk-tag--yellow";
    case "unlikely_to_meet":
      return "govuk-tag--red";
  }
}

function riskLabel(riskLevel: SittingForecast["risk_level"]) {
  switch (riskLevel) {
    case "on_track":
      return "On track";
    case "at_risk":
      return "At risk";
    case "unlikely_to_meet":
      return "Unlikely to meet";
  }
}

export function SittingForecastPanel({ forecast }: SittingForecastPanelProps) {
  if (!forecast) return null;

  const scope = forecast.multi_court ? "multi-court" : "single court";

  return (
    <div className="govuk-!-margin-bottom-6">
      <h2 className="govuk-heading-l">Commitment forecast</h2>
      <p className="govuk-body govuk-!-margin-bottom-4">
        <strong className={`govuk-tag ${riskTagClass(forecast.risk_level)}`}>
          {riskLabel(forecast.risk_level)}
        </strong>
        {forecast.early_warning && forecast.risk_level !== "on_track" ? (
          <span className="govuk-body-s govuk-!-margin-left-2">Early warning</span>
        ) : null}
      </p>

      <p className="govuk-body">{forecast.message}</p>

      <dl className="govuk-summary-list govuk-!-margin-top-4">
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Projected end of year</dt>
          <dd className="govuk-summary-list__value">
            {formatFullDays(forecast.projected_full_days_end_of_year)}/
            {formatFullDays(forecast.full_days_required)} full days ({scope})
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Completed to date</dt>
          <dd className="govuk-summary-list__value">
            {formatFullDays(forecast.full_days_completed)} full days (
            {forecast.half_days_completed} half days)
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Fiscal year progress</dt>
          <dd className="govuk-summary-list__value">{forecast.fiscal_year_progress_pct}% elapsed</dd>
        </div>
        {forecast.projected_shortfall_full_days > 0 ? (
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Projected shortfall</dt>
            <dd className="govuk-summary-list__value">
              {formatFullDays(forecast.projected_shortfall_full_days)} full days
            </dd>
          </div>
        ) : null}
      </dl>

      <h3 className="govuk-heading-m govuk-!-margin-top-6">Sitting outcome rates</h3>
      <p className="govuk-hint">
        Based on {forecast.counts.scheduled_total} scheduled sittings in {forecast.fiscal_year_label}.
      </p>
      <div className="govuk-grid-row govuk-!-margin-bottom-4">
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Completed</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">
            {forecast.counts.completed}{" "}
            <span className="govuk-body-s">({forecast.rates.completed_pct}%)</span>
          </p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Vacated</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">
            {forecast.counts.vacated}{" "}
            <span className="govuk-body-s">({forecast.rates.vacated_pct}%)</span>
          </p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Cancelled</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">
            {forecast.counts.cancelled}{" "}
            <span className="govuk-body-s">({forecast.rates.cancelled_pct}%)</span>
          </p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Cancelled by DJ</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">
            {forecast.counts.cancelled_by_dj}{" "}
            <span className="govuk-body-s">({forecast.rates.cancelled_by_dj_pct}%)</span>
          </p>
        </div>
      </div>
      {forecast.completion_rate != null ? (
        <p className="govuk-body-s">
          Completion rate: <strong>{(forecast.completion_rate * 100).toFixed(1)}%</strong> of scheduled
          sittings completed.
        </p>
      ) : null}
    </div>
  );
}
