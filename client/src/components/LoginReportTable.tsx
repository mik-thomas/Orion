import { useId, useMemo } from "react";
import { MagistrateLink } from "./MagistrateLink";
import { DashboardSection } from "./DashboardSection";
import { SortableTableHeader } from "./SortableTableHeader";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { loginReportBucketRows } from "./charts/chartAggregations";
import { useTableSort } from "../lib/useTableSort";

export interface LoginReportRow {
  magistrate_id: number;
  magistrate: string;
  last_login_on: string;
  days_since_login: number | null;
}

interface LoginReportTableProps {
  rows: LoginReportRow[];
  heading?: string;
  emptyMessage?: string;
}

export function LoginReportTable({
  rows,
  heading = "Rota login report",
  emptyMessage = "No login data recorded yet.",
}: LoginReportTableProps) {
  const summaryId = useId();
  const sortColumns = useMemo(
    () => ({
      magistrate: { getValue: (row: LoginReportRow) => row.magistrate },
      last_login_on: { getValue: (row: LoginReportRow) => row.last_login_on, type: "date" as const },
      days_since_login: {
        getValue: (row: LoginReportRow) => row.days_since_login ?? -1,
        type: "number" as const,
      },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(rows, sortColumns, {
    key: "days_since_login",
    direction: "desc",
  });
  const staleCount = rows.filter((row) => row.days_since_login != null && row.days_since_login >= 90).length;

  return (
    <DashboardSection
      title={heading}
      tag={staleCount > 0 ? `${staleCount} overdue` : undefined}
      tagColour="red"
      description="Magistrates who have not logged into the rota system recently."
    >
      {rows.length === 0 ? (
        <p className="govuk-body">{emptyMessage}</p>
      ) : (
        <ChartTableToggle
          tableCaption={heading}
          hasData={rows.length > 0}
          chart={
            <HorizontalBarChart
              rows={loginReportBucketRows(rows)}
              emptyMessage={emptyMessage}
              summaryContext="days since login"
              summaryId={summaryId}
            />
          }
          table={
            <>
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <SortableTableHeader columnKey="magistrate" sort={sort} onSort={toggleSort}>
                    Magistrate
                  </SortableTableHeader>
                  <SortableTableHeader columnKey="last_login_on" sort={sort} onSort={toggleSort}>
                    Last login
                  </SortableTableHeader>
                  <SortableTableHeader columnKey="days_since_login" sort={sort} onSort={toggleSort}>
                    Days since login
                  </SortableTableHeader>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {sortedData.map((row) => (
                  <tr key={row.magistrate_id} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                    </td>
                    <td className="govuk-table__cell">{row.last_login_on}</td>
                    <td className="govuk-table__cell">
                      {row.days_since_login != null ? (
                        row.days_since_login >= 90 ? (
                          <strong className="govuk-tag govuk-tag--red">{row.days_since_login}</strong>
                        ) : row.days_since_login >= 30 ? (
                          <strong className="govuk-tag govuk-tag--yellow">{row.days_since_login}</strong>
                        ) : (
                          row.days_since_login
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          }
        />
      )}
    </DashboardSection>
  );
}
