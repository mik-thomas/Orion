import { useId, useMemo } from "react";
import { DashboardSection } from "./DashboardSection";
import { MagistrateLink } from "./MagistrateLink";
import { SortableTableHeader } from "./SortableTableHeader";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { retiringSoonRows } from "./charts/chartAggregations";
import { useTableSort } from "../lib/useTableSort";
import type { RetiringSoonRow } from "../types/domain";

interface RetiringSoonSectionProps {
  rows: RetiringSoonRow[];
  canViewNames: boolean;
}

export function RetiringSoonSection({ rows, canViewNames }: RetiringSoonSectionProps) {
  const summaryId = useId();
  const sortColumns = useMemo(
    () => ({
      display_name: { getValue: (row: RetiringSoonRow) => row.display_name },
      retirement_on: { getValue: (row: RetiringSoonRow) => row.retirement_on, type: "date" as const },
      days_until_retirement: {
        getValue: (row: RetiringSoonRow) => row.days_until_retirement,
        type: "number" as const,
      },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(rows, sortColumns, {
    key: "retirement_on",
    direction: "asc",
  });

  if (rows.length === 0) return null;

  return (
    <DashboardSection
      title="Retiring soon"
      tag={`${rows.length} in next 6 months`}
      tagColour="yellow"
      description="Magistrates with a recorded retirement date in the next six months."
    >
      <ChartTableToggle
        tableCaption="Retiring soon"
        hasData={rows.length > 0}
        chart={
          <HorizontalBarChart
            rows={retiringSoonRows(rows)}
            emptyMessage="No retirements in the next six months."
            summaryContext="days until retirement"
            summaryId={summaryId}
          />
        }
        table={
          <>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="display_name" sort={sort} onSort={toggleSort}>
                  {canViewNames ? "Name" : "Reference"}
                </SortableTableHeader>
                <SortableTableHeader columnKey="retirement_on" sort={sort} onSort={toggleSort}>
                  Retirement date
                </SortableTableHeader>
                <SortableTableHeader columnKey="days_until_retirement" sort={sort} onSort={toggleSort}>
                  Days until retirement
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedData.map((row) => (
                <tr key={row.magistrate_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <MagistrateLink id={row.magistrate_id} name={row.display_name} />
                  </td>
                  <td className="govuk-table__cell">{row.retirement_on}</td>
                  <td className="govuk-table__cell">
                    {row.imminent ? (
                      <strong className="govuk-tag govuk-tag--yellow">{row.days_until_retirement}</strong>
                    ) : (
                      row.days_until_retirement
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </>
        }
      />
    </DashboardSection>
  );
}
