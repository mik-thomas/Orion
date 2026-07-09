import { useEffect, useId, useState } from "react";
import { getReportsOverview } from "../api/reports";
import { ApiError } from "../api/http";
import { DashboardSection } from "../components/DashboardSection";
import { DonutOrBarChart } from "../components/charts/DonutOrBarChart";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { SimpleBreakdownTable } from "../components/charts/SimpleBreakdownTable";
import { SittingStatusTable } from "../components/charts/SittingStatusTable";
import { ViewChartButton } from "../components/charts/ViewChartButton";
import type { ReportsOverview } from "../types/domain";

export function ReportsPage() {
  const [reports, setReports] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const statusSummaryId = useId();
  const locationSummaryId = useId();

  useEffect(() => {
    getReportsOverview()
      .then(setReports)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="govuk-heading-xl">Reports</h1>
      <p className="govuk-body-l">Sitting volumes, vacated sessions and magistrate movement across the borough.</p>

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="govuk-body">Loading…</p>
      ) : reports ? (
        <>
          <p className="govuk-body govuk-!-margin-bottom-6">
            {reports.summary.sittings} sittings recorded across {reports.summary.courthouses} courthouses.
          </p>

          <div className="govuk-grid-row">
            <div className="govuk-grid-column-one-half">
              <DashboardSection title="Sitting status" description={reports.period.label}>
                <ViewChartButton
                  title="Sitting status"
                  chart={
                    <DonutOrBarChart
                      totals={{
                        completed: reports.summary.completed_sittings,
                        vacated: reports.summary.vacated_sittings,
                        cancelled: reports.summary.cancelled_sittings - reports.summary.cancelled_by_dj,
                        cancelled_by_dj: reports.summary.cancelled_by_dj,
                      }}
                      summaryContext={reports.period.label}
                      summaryId={statusSummaryId}
                      variant="donut"
                    />
                  }
                />
                <SittingStatusTable
                  caption="Sitting status"
                  totals={{
                    completed: reports.summary.completed_sittings,
                    vacated: reports.summary.vacated_sittings,
                    cancelled: reports.summary.cancelled_sittings - reports.summary.cancelled_by_dj,
                    cancelled_by_dj: reports.summary.cancelled_by_dj,
                  }}
                />
              </DashboardSection>
            </div>

            <div className="govuk-grid-column-one-half">
              <DashboardSection title="Sittings by courthouse" description={reports.period.label}>
                <ViewChartButton
                  title="Sittings by courthouse"
                  chart={
                    <HorizontalBarChart
                      rows={reports.by_courthouse.map((row) => ({
                        key: row.courthouse,
                        label: row.courthouse,
                        value: row.sittings,
                      }))}
                      emptyMessage="No sitting data yet."
                      summaryContext={reports.period.label}
                      summaryId={locationSummaryId}
                    />
                  }
                />
                <SimpleBreakdownTable
                  caption="Sittings by courthouse"
                  labelHeader="Courthouse"
                  valueHeader="Sittings"
                  rows={reports.by_courthouse.map((row) => ({
                    label: row.courthouse,
                    value: row.sittings,
                  }))}
                  emptyMessage="No sitting data yet."
                />
              </DashboardSection>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
