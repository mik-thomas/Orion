import { useId, type ReactNode } from "react";
import { DrillDownLink } from "./DrillDownLink";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import type { PeriodFilterState } from "../lib/periodFilter";
import type { SittingsDrillDownFilters } from "../lib/sittingsDrillDown";

type BreakdownRow = {
  key: string;
  label: string;
  value: number;
};

type DashboardBreakdownPanelProps = {
  title: string;
  rows: BreakdownRow[];
  labelHeader: string;
  valueHeader?: string;
  periodFilter: PeriodFilterState;
  periodLabel?: string;
  filterForRow: (row: BreakdownRow) => SittingsDrillDownFilters;
  emptyMessage?: string;
  heading?: ReactNode;
};

export function DashboardBreakdownPanel({
  title,
  rows,
  labelHeader,
  valueHeader = "Sittings",
  periodFilter,
  periodLabel,
  filterForRow,
  emptyMessage = "No data yet.",
  heading,
}: DashboardBreakdownPanelProps) {
  const summaryId = useId();

  if (rows.length === 0) {
    return (
      <div className="orion-dashboard-subsection">
        {heading ?? <h3 className="govuk-heading-s orion-dashboard-subsection__title">{title}</h3>}
        <p className="govuk-body">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="orion-dashboard-subsection">
      {heading ?? <h3 className="govuk-heading-s orion-dashboard-subsection__title">{title}</h3>}
      <ChartTableToggle
        tableCaption={title}
        hasData={rows.length > 0}
        chart={
          <HorizontalBarChart
            rows={rows.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.value,
            }))}
            emptyMessage={emptyMessage}
            summaryContext={periodLabel ?? title.toLowerCase()}
            summaryId={summaryId}
          />
        }
        table={
          <>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  {labelHeader}
                </th>
                <th scope="col" className="govuk-table__header">
                  {valueHeader}
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {rows.map((row) => {
                const filters = filterForRow(row);
                return (
                  <tr key={row.key} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      <DrillDownLink
                        filters={filters}
                        period={periodFilter}
                        ariaLabel={`View sittings for ${row.label}`}
                      >
                        {row.label}
                      </DrillDownLink>
                    </td>
                    <td className="govuk-table__cell">
                      <DrillDownLink
                        filters={filters}
                        period={periodFilter}
                        ariaLabel={`View ${row.value} sittings for ${row.label}`}
                      >
                        {row.value}
                      </DrillDownLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </>
        }
      />
    </div>
  );
}
