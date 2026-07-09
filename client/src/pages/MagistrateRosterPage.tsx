import { useEffect, useId, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { listMagistrateRoster } from "../api/magistrates";
import { ApiError } from "../api/http";
import { DashboardSection } from "../components/DashboardSection";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { rosterHomeCourtRows } from "../components/charts/chartAggregations";
import { useRole } from "../context/RoleContext";
import type { MagistrateRosterEntry } from "../types/domain";

export function MagistrateRosterPage() {
  const { role, canViewRoster } = useRole();
  const [entries, setEntries] = useState<MagistrateRosterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const homeCourtSummaryId = useId();

  useEffect(() => {
    if (!canViewRoster) {
      setLoading(false);
      return;
    }

    setLoading(true);
    listMagistrateRoster()
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load roster"))
      .finally(() => setLoading(false));
  }, [canViewRoster, role]);

  if (!canViewRoster) {
    return <Navigate to="/magistrates" replace />;
  }

  return (
    <>
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <Link to="/magistrates" className="govuk-breadcrumbs__link">
              Magistrates
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            Roster
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">Magistrate roster</h1>
      <p className="govuk-body-l">
        Manager view mapping reference codes to full names. Only HMCTS-SLM and Developer roles can access this page.
      </p>

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
      ) : (
        <>
          {entries.length > 0 ? (
            <DashboardSection title="Roster by home court" description="Distribution of magistrates across home courts.">
              <HorizontalBarChart
                rows={rosterHomeCourtRows(entries)}
                emptyMessage="No roster data."
                summaryContext="roster"
                summaryId={homeCourtSummaryId}
              />
            </DashboardSection>
          ) : null}

          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Reference
                </th>
                <th scope="col" className="govuk-table__header">
                  Full name
                </th>
                <th scope="col" className="govuk-table__header">
                  Home court
                </th>
                <th scope="col" className="govuk-table__header">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {entries.map((entry) => (
                <tr key={entry.id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <Link to={`/magistrates/${entry.id}`} className="govuk-link">
                      {entry.reference_code}
                    </Link>
                  </td>
                  <td className="govuk-table__cell">{entry.full_name}</td>
                  <td className="govuk-table__cell">{entry.home_courthouse ?? "—"}</td>
                  <td className="govuk-table__cell">{entry.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
