import { useEffect, useState, type FormEvent } from "react";
import { listMagistrates } from "../api/magistrates";
import { getReportsOverview } from "../api/reports";
import { ApiError } from "../api/http";
import { ClusterMovementSection } from "../components/ClusterMovementSection";
import { DashboardSection } from "../components/DashboardSection";
import { DashboardStat } from "../components/DashboardStat";
import { DrillDownLink } from "../components/DrillDownLink";
import { MagistrateLink } from "../components/MagistrateLink";
import { LoginReportTable } from "../components/LoginReportTable";
import { CourtRoomTable } from "../components/CourtRoomTable";
import { DjCancellationSection } from "../components/DjCancellationSection";
import { PeriodFilter } from "../components/PeriodFilter";
import { useRole } from "../context/RoleContext";
import {
  defaultPeriodFilter,
  periodFilterLabel,
  periodFilterQuery,
  type PeriodFilterState,
} from "../lib/periodFilter";
import type { MagistrateSummary, ReportsOverview } from "../types/domain";
import type { SittingsDrillDownFilters } from "../lib/sittingsDrillDown";

function SittingStatLink({
  count,
  filters,
  period,
  ariaLabel,
}: {
  count: number;
  filters: SittingsDrillDownFilters;
  period: PeriodFilterState;
  ariaLabel: string;
}) {
  if (count === 0) {
    return <span className="orion-dashboard-stat__zero">0</span>;
  }

  return (
    <DrillDownLink filters={filters} period={period} ariaLabel={ariaLabel}>
      {count}
    </DrillDownLink>
  );
}

function awaySittingsTag(count: number) {
  if (count >= 10) return { text: String(count), colour: "red" as const };
  if (count >= 5) return { text: String(count), colour: "yellow" as const };
  return null;
}

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

  const periodTag = periodFilterLabel(periodFilter);
  const periodTagColour = periodFilter.mode === "all" ? "grey" : "blue";

  return (
    <>
      <h1 className="govuk-heading-xl">Dashboard</h1>
      <p className="govuk-body-l">
        Sitting patterns across courthouses and magistrate movement.
      </p>

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      <DashboardSection title="Search magistrates">
        <form onSubmit={handleSearch}>
          <div className="govuk-form-group govuk-!-margin-bottom-4">
            <label className="govuk-label govuk-label--m" htmlFor="search">
              Find a magistrate
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

        {searchTerm ? (
          <div className="orion-dashboard-subsection govuk-!-margin-top-6">
            <h3 className="govuk-heading-m orion-dashboard-subsection__title">
              Results for &ldquo;{searchTerm}&rdquo;
            </h3>
            {results.length === 0 ? (
              <p className="govuk-body">No magistrates matched.</p>
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
          </div>
        ) : null}
      </DashboardSection>

      <DashboardSection
        title="Sitting overview"
        tag={periodTag}
        tagColour={periodTagColour}
        headerAside={
          <PeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            availableYears={availableYears}
            compact
          />
        }
      >
        {loading ? (
          <p className="govuk-body">Loading sitting data…</p>
        ) : reports ? (
          <>
            <p className="govuk-hint orion-dashboard-overview-hint">
              Click a figure to view matching sittings.
            </p>

            <div className="orion-dashboard-stats orion-dashboard-stats--primary">
              <DashboardStat label="Completed" tone="green">
                <SittingStatLink
                  count={reports.summary.completed_sittings}
                  filters={{ status: "completed" }}
                  period={periodFilter}
                  ariaLabel={`View ${reports.summary.completed_sittings} completed sittings`}
                />
              </DashboardStat>
              <DashboardStat label="Vacated" tone="yellow">
                <SittingStatLink
                  count={reports.summary.vacated_sittings}
                  filters={{ status: "vacated" }}
                  period={periodFilter}
                  ariaLabel={`View ${reports.summary.vacated_sittings} vacated sittings`}
                />
              </DashboardStat>
              <DashboardStat label="Cancelled" tone="red">
                <SittingStatLink
                  count={reports.summary.cancelled_sittings}
                  filters={{ status: "cancelled" }}
                  period={periodFilter}
                  ariaLabel={`View ${reports.summary.cancelled_sittings} cancelled sittings`}
                />
              </DashboardStat>
              <DashboardStat label="Cancelled by DJ" tone="red">
                <SittingStatLink
                  count={reports.summary.cancelled_by_dj}
                  filters={{ status: "cancelled", cancellation_category: "district_judge" }}
                  period={periodFilter}
                  ariaLabel={`View ${reports.summary.cancelled_by_dj} sittings cancelled by District Judge`}
                />
              </DashboardStat>
              <DashboardStat label="Cancelled by HMCTS" tone="red">
                <SittingStatLink
                  count={reports.summary.cancelled_by_hmcts}
                  filters={{ status: "cancelled", cancellation_category: "hmcts" }}
                  period={periodFilter}
                  ariaLabel={`View ${reports.summary.cancelled_by_hmcts} sittings cancelled by HMCTS`}
                />
              </DashboardStat>
              <DashboardStat label="Cancelled by magistrate" tone="red">
                <SittingStatLink
                  count={reports.summary.cancelled_by_magistrate}
                  filters={{ status: "cancelled", cancellation_category: "magistrate" }}
                  period={periodFilter}
                  ariaLabel={`View ${reports.summary.cancelled_by_magistrate} sittings cancelled by magistrate`}
                />
              </DashboardStat>
            </div>

            <dl className="orion-dashboard-context-stats">
              <div className="orion-dashboard-context-stats__item">
                <dt className="orion-dashboard-context-stats__label">Magistrates</dt>
                <dd className="orion-dashboard-context-stats__value">{reports.summary.magistrates}</dd>
              </div>
              <div className="orion-dashboard-context-stats__item">
                <dt className="orion-dashboard-context-stats__label">Total sittings</dt>
                <dd className="orion-dashboard-context-stats__value">{reports.summary.sittings}</dd>
              </div>
              <div className="orion-dashboard-context-stats__item">
                <dt className="orion-dashboard-context-stats__label">Courthouses</dt>
                <dd className="orion-dashboard-context-stats__value">{reports.summary.courthouses}</dd>
              </div>
              <div className="orion-dashboard-context-stats__item">
                <dt className="orion-dashboard-context-stats__label">Active magistrates</dt>
                <dd className="orion-dashboard-context-stats__value">{reports.summary.active_magistrates}</dd>
              </div>
              <div className="orion-dashboard-context-stats__item">
                <dt className="orion-dashboard-context-stats__label">Sitting types</dt>
                <dd className="orion-dashboard-context-stats__value">{reports.summary.sitting_types}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </DashboardSection>

      {!loading && reports ? (
        <>
          {reports.dj_cancellations ? (
            <DjCancellationSection report={reports.dj_cancellations} periodFilter={periodFilter} />
          ) : null}

          <DashboardSection
            title="Breakdown by location and type"
            description="Courthouse, court type, business type and court room totals for the selected period."
          >
            <p className="govuk-hint orion-dashboard-hint">
              <strong className="govuk-tag govuk-tag--grey">Drill-down</strong> Click any figure to view matching
              sittings.
            </p>

            <div className="govuk-grid-row">
              <div className="govuk-grid-column-one-half">
                <div className="orion-dashboard-subsection">
                  <h3 className="govuk-heading-s orion-dashboard-subsection__title">Sittings by courthouse</h3>
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
                            <td className="govuk-table__cell">
                              <DrillDownLink
                                filters={{ courthouse: row.courthouse }}
                                period={periodFilter}
                                ariaLabel={`View sittings at ${row.courthouse}`}
                              >
                                {row.courthouse}
                              </DrillDownLink>
                            </td>
                            <td className="govuk-table__cell">
                              <DrillDownLink
                                filters={{ courthouse: row.courthouse }}
                                period={periodFilter}
                                ariaLabel={`View ${row.sittings} sittings at ${row.courthouse}`}
                              >
                                {row.sittings}
                              </DrillDownLink>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="govuk-grid-column-one-half">
                <div className="orion-dashboard-subsection">
                  <h3 className="govuk-heading-s orion-dashboard-subsection__title">Sittings by court type</h3>
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
                            <td className="govuk-table__cell">
                              <DrillDownLink
                                filters={{ court_type: row.court_type }}
                                period={periodFilter}
                                ariaLabel={`View sittings for court type ${row.court_type}`}
                              >
                                {row.court_type}
                              </DrillDownLink>
                            </td>
                            <td className="govuk-table__cell">
                              <DrillDownLink
                                filters={{ court_type: row.court_type }}
                                period={periodFilter}
                                ariaLabel={`View ${row.sittings} sittings for court type ${row.court_type}`}
                              >
                                {row.sittings}
                              </DrillDownLink>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="orion-dashboard-subsection">
              <h3 className="govuk-heading-s orion-dashboard-subsection__title">
                Business types (Remands, Trials, etc.)
              </h3>
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
                        <td className="govuk-table__cell">
                          <DrillDownLink
                            filters={{ sitting_type: row.sitting_type }}
                            period={periodFilter}
                            ariaLabel={`View sittings for business type ${row.sitting_type}`}
                          >
                            {row.sitting_type}
                          </DrillDownLink>
                        </td>
                        <td className="govuk-table__cell">
                          <DrillDownLink
                            filters={{ sitting_type: row.sitting_type }}
                            period={periodFilter}
                            ariaLabel={`View ${row.sittings} sittings for business type ${row.sitting_type}`}
                          >
                            {row.sittings}
                          </DrillDownLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <CourtRoomTable rows={reports.by_court_room} periodFilter={periodFilter} embedded />
          </DashboardSection>

          {reports.home_court_movement ? (
            <ClusterMovementSection report={reports.home_court_movement} />
          ) : null}

          <DashboardSection
            title="Away from home court"
            tag={
              reports.away_from_home.length > 0
                ? `${reports.away_from_home.length} magistrate${reports.away_from_home.length === 1 ? "" : "s"}`
                : undefined
            }
            tagColour="yellow"
            description="Magistrates with completed sittings outside their home courthouse."
          >
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
                  {reports.away_from_home.map((row) => {
                    const tag = awaySittingsTag(row.away_sittings);
                    return (
                      <tr key={row.magistrate_id} className="govuk-table__row">
                        <td className="govuk-table__cell">
                          <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                        </td>
                        <td className="govuk-table__cell">
                          {tag ? (
                            <strong className={`govuk-tag govuk-tag--${tag.colour}`}>{tag.text}</strong>
                          ) : (
                            row.away_sittings
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DashboardSection>

          <LoginReportTable rows={reports.login_report} />

          {reports.commitment_forecast.length > 0 ? (
            <DashboardSection
              title="Commitment forecast"
              tag={`${reports.commitment_forecast.length} at risk`}
              tagColour="yellow"
              description="Magistrates projected to miss their sitting commitment based on current completion rates."
            >
              <table className="govuk-table">
                <thead className="govuk-table__head">
                  <tr className="govuk-table__row">
                    <th scope="col" className="govuk-table__header">
                      Magistrate
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Risk
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Projected
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Completion rate
                    </th>
                  </tr>
                </thead>
                <tbody className="govuk-table__body">
                  {reports.commitment_forecast.map((row) => {
                    const tagColour =
                      row.risk_level === "unlikely_to_meet"
                        ? "red"
                        : row.risk_level === "at_risk"
                          ? "yellow"
                          : "green";
                    const tagLabel =
                      row.risk_level === "unlikely_to_meet"
                        ? "Unlikely to meet"
                        : row.risk_level === "at_risk"
                          ? "At risk"
                          : "On track";

                    return (
                      <tr key={row.magistrate_id} className="govuk-table__row">
                        <td className="govuk-table__cell">
                          <MagistrateLink id={row.magistrate_id} name={row.display_name} />
                        </td>
                        <td className="govuk-table__cell">
                          <strong className={`govuk-tag govuk-tag--${tagColour}`}>{tagLabel}</strong>
                        </td>
                        <td className="govuk-table__cell">
                          {row.projected_full_days_end_of_year}/{row.full_days_required} full days
                        </td>
                        <td className="govuk-table__cell">
                          {row.completion_rate != null
                            ? `${(row.completion_rate * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DashboardSection>
          ) : null}

          <p className="govuk-body govuk-hint">{reports.note}</p>
        </>
      ) : null}
    </>
  );
}
