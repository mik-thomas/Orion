import { useEffect, useState } from "react";
import { getReportsOverview } from "../api/reports";
import { ApiError } from "../api/http";
import type { ReportsOverview } from "../types/domain";

export function ReportsPage() {
  const [reports, setReports] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <p className="govuk-body">
          {reports.summary.sittings} sittings recorded across {reports.summary.courthouses} courthouses.
          Detailed borough movement reports will expand when sitting imports are connected.
        </p>
      ) : null}
    </>
  );
}
