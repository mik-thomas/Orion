import type { PeriodFilterState } from "../lib/periodFilter";
import { QUARTER_OPTIONS } from "../lib/periodFilter";

type PeriodFilterProps = {
  value: PeriodFilterState;
  onChange: (value: PeriodFilterState) => void;
  availableYears: string[];
  compact?: boolean;
};

export function PeriodFilter({ value, onChange, availableYears, compact = false }: PeriodFilterProps) {
  const yearDisabled = value.mode === "all";
  const quarterDisabled = value.mode === "all";

  const periodSelect = (
    <select
      className="govuk-select"
      id="period-mode"
      value={value.mode}
      onChange={(event) => {
        const mode = event.target.value as PeriodFilterState["mode"];
        if (mode === "all") {
          onChange({ mode: "all", fiscalYear: null, quarter: null });
          return;
        }

        onChange({
          mode: "fiscal_year",
          fiscalYear: value.fiscalYear ?? availableYears[0] ?? null,
          quarter: null,
        });
      }}
    >
      <option value="fiscal_year">Fiscal year</option>
      <option value="all">All</option>
    </select>
  );

  const yearSelect = (
    <select
      className="govuk-select"
      id="period-year"
      value={value.fiscalYear ?? ""}
      disabled={yearDisabled}
      onChange={(event) =>
        onChange({
          ...value,
          mode: "fiscal_year",
          fiscalYear: event.target.value || null,
        })
      }
    >
      {availableYears.length === 0 ? (
        <option value="">No years available</option>
      ) : (
        availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))
      )}
    </select>
  );

  const quarterSelect = (
    <select
      className="govuk-select"
      id="period-quarter"
      value={value.quarter ?? ""}
      disabled={quarterDisabled}
      onChange={(event) =>
        onChange({
          ...value,
          mode: "fiscal_year",
          quarter: event.target.value || null,
        })
      }
    >
      <option value="">All quarters</option>
      {QUARTER_OPTIONS.map((quarter) => (
        <option key={quarter} value={quarter}>
          {quarter}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <div className="orion-period-filter orion-period-filter--compact">
        <div className="orion-period-filter__control">
          <label className="govuk-label govuk-label--s" htmlFor="period-mode">
            Period
          </label>
          {periodSelect}
        </div>
        <div className="orion-period-filter__control">
          <label className="govuk-label govuk-label--s" htmlFor="period-year">
            Year
          </label>
          {yearSelect}
        </div>
        <div className="orion-period-filter__control">
          <label className="govuk-label govuk-label--s" htmlFor="period-quarter">
            Quarter
          </label>
          {quarterSelect}
        </div>
      </div>
    );
  }

  return (
    <div className="govuk-form-group orion-period-filter">
      <fieldset className="govuk-fieldset">
        <legend className="govuk-fieldset__legend govuk-fieldset__legend--s">Filter period</legend>

        <div className="govuk-grid-row">
          <div className="govuk-grid-column-one-third">
            <label className="govuk-label" htmlFor="period-mode">
              Period
            </label>
            {periodSelect}
          </div>

          <div className="govuk-grid-column-one-third">
            <label className="govuk-label" htmlFor="period-year">
              Year
            </label>
            {yearSelect}
          </div>

          <div className="govuk-grid-column-one-third">
            <label className="govuk-label" htmlFor="period-quarter">
              Quarter
            </label>
            {quarterSelect}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
