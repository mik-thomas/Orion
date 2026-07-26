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
      <div className="orion-table-scroll">
        <table className="govuk-table">
          {/* Caption kept for screen readers; section/card titles already show this visually. */}
          <caption className="govuk-table__caption govuk-visually-hidden">{tableCaption}</caption>
          {table}
        </table>
      </div>
    </>
  );
}
