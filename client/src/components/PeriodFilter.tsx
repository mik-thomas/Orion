import type { PeriodFilterState } from "../lib/periodFilter";
import { QUARTER_OPTIONS } from "../lib/periodFilter";

type PeriodFilterProps = {
  value: PeriodFilterState;
  onChange: (value: PeriodFilterState) => void;
  availableYears: string[];
};

export function PeriodFilter({ value, onChange, availableYears }: PeriodFilterProps) {
  const yearDisabled = value.mode === "all";
  const quarterDisabled = value.mode === "all";

  return (
    <div className="govuk-form-group orion-period-filter">
      <fieldset className="govuk-fieldset">
        <legend className="govuk-fieldset__legend govuk-fieldset__legend--s">
          Filter period
        </legend>

        <div className="govuk-grid-row">
          <div className="govuk-grid-column-one-third">
            <label className="govuk-label" htmlFor="period-mode">
              Period
            </label>
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
          </div>

          <div className="govuk-grid-column-one-third">
            <label className="govuk-label" htmlFor="period-year">
              Year
            </label>
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
          </div>

          <div className="govuk-grid-column-one-third">
            <label className="govuk-label" htmlFor="period-quarter">
              Quarter
            </label>
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
          </div>
        </div>
      </fieldset>
    </div>
  );
}
