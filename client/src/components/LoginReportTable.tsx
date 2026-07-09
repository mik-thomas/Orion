import { useId } from "react";
import { MagistrateLink } from "./MagistrateLink";
import { DashboardSection } from "./DashboardSection";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { loginReportBucketRows } from "./charts/chartAggregations";

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
                  <th scope="col" className="govuk-table__header">
                    Magistrate
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Last login
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Days since login
                  </th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {rows.map((row) => (
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
