import { type ReactNode } from "react";
import { ViewChartButton } from "./ViewChartButton";

type ChartTableToggleProps = {
  chart: ReactNode;
  table: ReactNode;
  tableCaption: string;
  hasData?: boolean;
};

/** Table-first view with optional chart in an accessible modal. */
export function ChartTableToggle({
  chart,
  table,
  tableCaption,
  hasData = true,
}: ChartTableToggleProps) {
  if (!hasData) {
    return <>{chart}</>;
  }

  return (
    <>
      <ViewChartButton title={tableCaption} chart={chart} />
      <table className="govuk-table">
        <caption className="govuk-table__caption govuk-table__caption--m">{tableCaption}</caption>
        {table}
      </table>
    </>
  );
}
