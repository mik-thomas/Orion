import { useEffect, useState, type FormEvent } from "react";
import { listMagistrates } from "../api/magistrates";
import { getReportsOverview } from "../api/reports";
import { ApiError } from "../api/http";
import { ClusterMovementSection } from "../components/ClusterMovementSection";
import { MagistrateLink } from "../components/MagistrateLink";
import { LoginReportTable } from "../components/LoginReportTable";
import { CourtRoomTable } from "../components/CourtRoomTable";
import { DjCancellationSection } from "../components/DjCancellationSection";
import { PeriodFilter } from "../components/PeriodFilter";
import { useRole } from "../context/RoleContext";
import {
  defaultPeriodFilter,
  periodFilterQuery,
  type PeriodFilterState,
} from "../lib/periodFilter";
import type { MagistrateSummary, ReportsOverview } from "../types/domain";

export function DashboardPage() {
  const { role, canViewNames } = useRole();
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>(defaultPeriodFilter());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportsOverview | null>(null);
  const [results, setResults] = useState<MagistrateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getReportsOverview(periodFilterQuery(periodFilter))
      .then((data) => {
        setReports(data);
        setAvailableYears(data.available_fiscal_years);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load sitting data");
      })
      .finally(() => setLoading(false));
  }, [periodFilter, role]);

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }

    listMagistrates(searchTerm)
      .then(setResults)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Search failed");
      });
  }, [searchTerm, role]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSearchTerm(query.trim());
  }

  return (
    <>
      <h1 className="govuk-heading-xl">Dashboard</h1>
      <p className="govuk-body-l">
        Sitting patterns across courthouses and magistrate movement. Import full sitting data later.
      </p>

      <form className="govuk-!-margin-bottom-6" onSubmit={handleSearch}>
        <div className="govuk-form-group">
          <label className="govuk-label govuk-label--m" htmlFor="search">
            Search magistrates
          </label>
          <div id="search-hint" className="govuk-hint">
            {canViewNames
              ? "Search by name, email, reference code, home court, sitting location or bench."
              : "Search by reference code, home court, sitting location or bench."}
          </div>
          <input
            className="govuk-input govuk-!-width-two-thirds"
            id="search"
            name="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby="search-hint"
          />
        </div>
        <button type="submit" className="govuk-button" data-module="govuk-button">
          Search
        </button>
      </form>

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      {searchTerm && (
        <section className="govuk-!-margin-bottom-8">
          <h2 className="govuk-heading-l">Search results</h2>
          {results.length === 0 ? (
            <p className="govuk-body">No magistrates matched &ldquo;{searchTerm}&rdquo;.</p>
          ) : (
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">
                    {canViewNames ? "Name" : "Reference"}
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Home court
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Bench
                  </th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {results.map((magistrate) => (
                  <tr key={magistrate.id} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      <MagistrateLink id={magistrate.id} name={magistrate.display_name} />
                    </td>
                <td className="govuk-table__cell">{magistrate.home_courthouse?.name ?? "—"}</td>
                <td className="govuk-table__cell">{magistrate.home_courthouse?.bench ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <h2 className="govuk-heading-l">Sitting overview</h2>
      <PeriodFilter
        value={periodFilter}
        onChange={setPeriodFilter}
        availableYears={availableYears}
      />
      {loading ? (
        <p className="govuk-body">Loading sitting data…</p>
      ) : reports ? (
        <>
          <div className="govuk-grid-row govuk-!-margin-bottom-6">
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Completed</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.completed_sittings}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Vacated</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.vacated_sittings}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Cancelled</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.cancelled_sittings}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Cancelled by DJ</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.cancelled_by_dj}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Magistrates</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.magistrates}</p>
            </div>
          </div>

          <div className="govuk-grid-row govuk-!-margin-bottom-6">
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Total sittings</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.sittings}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Courthouses</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.courthouses}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Active magistrates</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.active_magistrates}</p>
            </div>
            <div className="govuk-grid-column-one-quarter">
              <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Sitting types</p>
              <p className="govuk-heading-m govuk-!-margin-top-0">{reports.summary.sitting_types}</p>
            </div>
          </div>

          {reports.dj_cancellations && <DjCancellationSection report={reports.dj_cancellations} />}

          <div className="govuk-grid-row">
            <div className="govuk-grid-column-one-half">
              <h3 className="govuk-heading-m">Sittings by courthouse</h3>
              {reports.by_courthouse.length === 0 ? (
                <p className="govuk-body">No sitting data yet.</p>
              ) : (
                <table className="govuk-table">
                  <thead className="govuk-table__head">
                    <tr className="govuk-table__row">
                      <th scope="col" className="govuk-table__header">
                        Courthouse
                      </th>
                      <th scope="col" className="govuk-table__header">
                        Sittings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="govuk-table__body">
                    {reports.by_courthouse.map((row) => (
                      <tr key={row.courthouse} className="govuk-table__row">
                        <td className="govuk-table__cell">{row.courthouse}</td>
                        <td className="govuk-table__cell">{row.sittings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="govuk-grid-column-one-half">
              <h3 className="govuk-heading-m">Sittings by court type</h3>
              {reports.by_court_type.length === 0 ? (
                <p className="govuk-body">No court type data yet.</p>
              ) : (
                <table className="govuk-table">
                  <thead className="govuk-table__head">
                    <tr className="govuk-table__row">
                      <th scope="col" className="govuk-table__header">
                        Court type
                      </th>
                      <th scope="col" className="govuk-table__header">
                        Sittings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="govuk-table__body">
                    {reports.by_court_type.map((row) => (
                      <tr key={row.court_type} className="govuk-table__row">
                        <td className="govuk-table__cell">{row.court_type}</td>
                        <td className="govuk-table__cell">{row.sittings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="govuk-grid-row govuk-!-margin-top-6">
            <div className="govuk-grid-column-one-half">
              <h3 className="govuk-heading-m">Business types (Remands, Trials, etc.)</h3>
              {reports.by_sitting_type.length === 0 ? (
                <p className="govuk-body">No sitting types recorded yet.</p>
              ) : (
                <table className="govuk-table">
                  <thead className="govuk-table__head">
                    <tr className="govuk-table__row">
                      <th scope="col" className="govuk-table__header">
                        Type
                      </th>
                      <th scope="col" className="govuk-table__header">
                        Sittings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="govuk-table__body">
                    {reports.by_sitting_type.map((row) => (
                      <tr key={row.sitting_type} className="govuk-table__row">
                        <td className="govuk-table__cell">{row.sitting_type}</td>
                        <td className="govuk-table__cell">{row.sittings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <CourtRoomTable rows={reports.by_court_room} />

          {reports.home_court_movement && (
            <ClusterMovementSection report={reports.home_court_movement} />
          )}

          <h3 className="govuk-heading-m govuk-!-margin-top-6">Away from home court</h3>
          {reports.away_from_home.length === 0 ? (
            <p className="govuk-body">No cross-court movement recorded yet.</p>
          ) : (
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">
                    Magistrate
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Away sittings
                  </th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {reports.away_from_home.map((row) => (
                  <tr key={row.magistrate_id} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                    </td>
                    <td className="govuk-table__cell">{row.away_sittings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <LoginReportTable rows={reports.login_report} />

          <p className="govuk-body govuk-!-margin-top-6 govuk-hint">{reports.note}</p>
        </>
      ) : null}
    </>
  );
}
