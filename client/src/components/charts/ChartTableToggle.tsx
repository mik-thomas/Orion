import { useId, useState, type ReactNode } from "react";

export type ChartTableViewMode = "chart" | "table" | "both";

type ChartTableToggleProps = {
  chart: ReactNode;
  table: ReactNode;
  tableCaption: string;
  hasData?: boolean;
  defaultMode?: ChartTableViewMode;
};

export function ChartTableToggle({
  chart,
  table,
  tableCaption,
  hasData = true,
  defaultMode = "chart",
}: ChartTableToggleProps) {
  const [mode, setMode] = useState<ChartTableViewMode>(defaultMode);
  const tablePanelId = useId();
  const fieldsetId = useId();

  if (!hasData) {
    return <>{chart}</>;
  }

  const showChart = mode === "chart" || mode === "both";
  const showTable = mode === "table" || mode === "both";

  return (
    <>
      <fieldset className="govuk-fieldset orion-chart-table-toggle govuk-!-margin-bottom-3">
        <legend className="govuk-fieldset__legend govuk-fieldset__legend--s govuk-visually-hidden">
          View mode
        </legend>
        <div className="govuk-radios govuk-radios--inline govuk-radios--small" role="radiogroup" aria-labelledby={fieldsetId}>
          <span id={fieldsetId} className="govuk-body-s govuk-!-margin-right-2">
            View:
          </span>
          {(
            [
              ["chart", "Chart"],
              ["table", "Table"],
              ["both", "Both"],
            ] as const
          ).map(([value, label]) => (
            <div key={value} className="govuk-radios__item">
              <input
                className="govuk-radios__input"
                id={`${fieldsetId}-${value}`}
                name={fieldsetId}
                type="radio"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <label className="govuk-label govuk-radios__label" htmlFor={`${fieldsetId}-${value}`}>
                {label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {showChart ? chart : null}

      {showTable ? (
        <div id={tablePanelId} className={showChart ? "govuk-!-margin-top-4" : undefined}>
          <table className="govuk-table">
            <caption className="govuk-table__caption govuk-table__caption--m">{tableCaption}</caption>
            {table}
          </table>
        </div>
      ) : null}
    </>
  );
}
