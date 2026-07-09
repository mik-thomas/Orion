import { useEffect, useId, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { listMagistrateRoster } from "../api/magistrates";
import { ApiError } from "../api/http";
import { DashboardSection } from "../components/DashboardSection";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { SimpleBreakdownTable } from "../components/charts/SimpleBreakdownTable";
import { ViewChartButton } from "../components/charts/ViewChartButton";
import { rosterHomeCourtRows } from "../components/charts/chartAggregations";
import { useRole } from "../context/RoleContext";
import { useTableSort } from "../lib/useTableSort";
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

  const sortColumns = useMemo(
    () => ({
      reference_code: { getValue: (row: MagistrateRosterEntry) => row.reference_code },
      full_name: { getValue: (row: MagistrateRosterEntry) => row.full_name },
      home_courthouse: { getValue: (row: MagistrateRosterEntry) => row.home_courthouse ?? "" },
      email: { getValue: (row: MagistrateRosterEntry) => row.email ?? "" },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(entries, sortColumns, {
    key: "reference_code",
    direction: "asc",
  });

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
          <table className="govuk-table govuk-!-margin-bottom-6">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="reference_code" sort={sort} onSort={toggleSort}>
                  Reference
                </SortableTableHeader>
                <SortableTableHeader columnKey="full_name" sort={sort} onSort={toggleSort}>
                  Full name
                </SortableTableHeader>
                <SortableTableHeader columnKey="home_courthouse" sort={sort} onSort={toggleSort}>
                  Home court
                </SortableTableHeader>
                <SortableTableHeader columnKey="email" sort={sort} onSort={toggleSort}>
                  Email
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedData.map((entry) => (
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

          {entries.length > 0 ? (
            <DashboardSection title="Roster by home court" description="Distribution of magistrates across home courts.">
              <ViewChartButton
                title="Roster by home court"
                chart={
                  <HorizontalBarChart
                    rows={rosterHomeCourtRows(entries)}
                    emptyMessage="No roster data."
                    summaryContext="roster"
                    summaryId={homeCourtSummaryId}
                  />
                }
              />
              <SimpleBreakdownTable
                caption="Roster by home court"
                labelHeader="Home court"
                valueHeader="Magistrates"
                rows={rosterHomeCourtRows(entries).map((row) => ({
                  label: row.label,
                  value: row.value,
                }))}
                emptyMessage="No roster data."
              />
            </DashboardSection>
          ) : null}
        </>
      )}
    </>
  );
}
