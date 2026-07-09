import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { listMagistrates } from "../api/magistrates";
import { getReportsOverview } from "../api/reports";
import { ApiError } from "../api/http";
import { ClusterMovementSection } from "../components/ClusterMovementSection";
import { DashboardBreakdownPanel } from "../components/DashboardBreakdownPanel";
import { DashboardSection } from "../components/DashboardSection";
import { DashboardDrillDownValue, DashboardStatPanel, dashboardStatValue } from "../components/DashboardStatPanel";
import { MagistrateLink } from "../components/MagistrateLink";
import { LoginReportTable } from "../components/LoginReportTable";
import { CourtRoomTable } from "../components/CourtRoomTable";
import { DjCancellationSection } from "../components/DjCancellationSection";
import { PeriodFilter } from "../components/PeriodFilter";
import { RetiringSoonSection } from "../components/RetiringSoonSection";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { ChartTableToggle } from "../components/charts/ChartTableToggle";
import { DonutOrBarChart } from "../components/charts/DonutOrBarChart";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { SittingStatusTable } from "../components/charts/SittingStatusTable";
import { ViewChartButton } from "../components/charts/ViewChartButton";
import { commitmentRiskRows } from "../components/charts/chartAggregations";
import { useRole } from "../context/RoleContext";
import {
  defaultPeriodFilter,
  periodFilterLabel,
  periodFilterQuery,
  type PeriodFilterState,
} from "../lib/periodFilter";
import type { MagistrateSummary, ReportsOverview } from "../types/domain";
import { useTableSort } from "../lib/useTableSort";

const RISK_SORT_ORDER = {
  unlikely_to_meet: 0,
  at_risk: 1,
  on_track: 2,
} as const;

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
  const sittingOverviewSummaryId = useId();
  const awayFromHomeSummaryId = useId();
  const commitmentRiskSummaryId = useId();

  const searchSortColumns = useMemo(
    () => ({
      display_name: { getValue: (row: MagistrateSummary) => row.display_name },
      home_court: { getValue: (row: MagistrateSummary) => row.home_courthouse?.name ?? "" },
      bench: { getValue: (row: MagistrateSummary) => row.home_courthouse?.bench ?? "" },
    }),
    []
  );
  const {
    sort: searchSort,
    toggleSort: toggleSearchSort,
    sortedData: sortedSearchResults,
  } = useTableSort(results, searchSortColumns, { key: "display_name", direction: "asc" });

  const awayFromHome = reports?.away_from_home ?? [];
  const awaySortColumns = useMemo(
    () => ({
      magistrate: { getValue: (row: (typeof awayFromHome)[number]) => row.magistrate },
      away_sittings: {
        getValue: (row: (typeof awayFromHome)[number]) => row.away_sittings,
        type: "number" as const,
      },
    }),
    []
  );
  const {
    sort: awaySort,
    toggleSort: toggleAwaySort,
    sortedData: sortedAwayFromHome,
  } = useTableSort(awayFromHome, awaySortColumns, { key: "away_sittings", direction: "desc" });

  const commitmentForecast = reports?.commitment_forecast ?? [];
  const commitmentSortColumns = useMemo(
    () => ({
      display_name: { getValue: (row: (typeof commitmentForecast)[number]) => row.display_name },
      risk_level: {
        getValue: (row: (typeof commitmentForecast)[number]) => RISK_SORT_ORDER[row.risk_level],
        type: "number" as const,
      },
      projected: {
        getValue: (row: (typeof commitmentForecast)[number]) => row.projected_full_days_end_of_year,
        type: "number" as const,
      },
      completion_rate: {
        getValue: (row: (typeof commitmentForecast)[number]) => row.completion_rate ?? -1,
        type: "number" as const,
      },
    }),
    []
  );
  const {
    sort: commitmentSort,
    toggleSort: toggleCommitmentSort,
    sortedData: sortedCommitmentForecast,
  } = useTableSort(commitmentForecast, commitmentSortColumns, { key: "risk_level", direction: "asc" });

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
                    <SortableTableHeader columnKey="display_name" sort={searchSort} onSort={toggleSearchSort}>
                      {canViewNames ? "Name" : "Reference"}
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="home_court" sort={searchSort} onSort={toggleSearchSort}>
                      Home court
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="bench" sort={searchSort} onSort={toggleSearchSort}>
                      Bench
                    </SortableTableHeader>
                  </tr>
                </thead>
                <tbody className="govuk-table__body">
                  {sortedSearchResults.map((magistrate) => (
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

      {!loading && reports?.retiring_soon?.length ? (
        <RetiringSoonSection rows={reports.retiring_soon} canViewNames={canViewNames} />
      ) : null}

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

            <DashboardStatPanel
              cols={3}
              items={[
                {
                  label: "Completed",
                  tone: "green",
                  value: (
                    <DashboardDrillDownValue
                      count={reports.summary.completed_sittings}
                      filters={{ status: "completed" }}
                      period={periodFilter}
                      ariaLabel={`View ${reports.summary.completed_sittings} completed sittings`}
                    />
                  ),
                },
                {
                  label: "Vacated",
                  tone: "yellow",
                  value: (
                    <DashboardDrillDownValue
                      count={reports.summary.vacated_sittings}
                      filters={{ status: "vacated" }}
                      period={periodFilter}
                      ariaLabel={`View ${reports.summary.vacated_sittings} vacated sittings`}
                    />
                  ),
                },
                {
                  label: "Cancelled",
                  tone: "red",
                  value: (
                    <DashboardDrillDownValue
                      count={reports.summary.cancelled_sittings}
                      filters={{ status: "cancelled" }}
                      period={periodFilter}
                      ariaLabel={`View ${reports.summary.cancelled_sittings} cancelled sittings`}
                    />
                  ),
                },
                {
                  label: "Cancelled by DJ",
                  tone: "red",
                  value: (
                    <DashboardDrillDownValue
                      count={reports.summary.cancelled_by_dj}
                      filters={{ status: "cancelled", cancellation_category: "district_judge" }}
                      period={periodFilter}
                      ariaLabel={`View ${reports.summary.cancelled_by_dj} sittings cancelled by District Judge`}
                    />
                  ),
                },
                {
                  label: "Cancelled by HMCTS",
                  tone: "red",
                  value: (
                    <DashboardDrillDownValue
                      count={reports.summary.cancelled_by_hmcts}
                      filters={{ status: "cancelled", cancellation_category: "hmcts" }}
                      period={periodFilter}
                      ariaLabel={`View ${reports.summary.cancelled_by_hmcts} sittings cancelled by HMCTS`}
                    />
                  ),
                },
                {
                  label: "Cancelled by magistrate",
                  tone: "red",
                  value: (
                    <DashboardDrillDownValue
                      count={reports.summary.cancelled_by_magistrate}
                      filters={{ status: "cancelled", cancellation_category: "magistrate" }}
                      period={periodFilter}
                      ariaLabel={`View ${reports.summary.cancelled_by_magistrate} sittings cancelled by magistrate`}
                    />
                  ),
                },
              ]}
            />

            <DashboardStatPanel
              cols={5}
              items={[
                { label: "Magistrates", value: dashboardStatValue(reports.summary.magistrates) },
                { label: "Total sittings", value: dashboardStatValue(reports.summary.sittings) },
                { label: "Courthouses", value: dashboardStatValue(reports.summary.courthouses) },
                { label: "Active magistrates", value: dashboardStatValue(reports.summary.active_magistrates) },
                { label: "Sitting types", value: dashboardStatValue(reports.summary.sitting_types) },
              ]}
            />

            <div className="orion-dashboard-subsection govuk-!-margin-top-6">
              <h3 className="govuk-heading-s orion-dashboard-subsection__title">Status breakdown</h3>
              <ViewChartButton
                title="Status breakdown"
                chart={
                  <DonutOrBarChart
                    totals={{
                      completed: reports.summary.completed_sittings,
                      vacated: reports.summary.vacated_sittings,
                      cancelled: reports.summary.cancelled_sittings - reports.summary.cancelled_by_dj,
                      cancelled_by_dj: reports.summary.cancelled_by_dj,
                    }}
                    summaryContext={periodTag}
                    summaryId={sittingOverviewSummaryId}
                    variant="donut"
                  />
                }
              />
              <SittingStatusTable
                caption="Status breakdown"
                totals={{
                  completed: reports.summary.completed_sittings,
                  vacated: reports.summary.vacated_sittings,
                  cancelled: reports.summary.cancelled_sittings - reports.summary.cancelled_by_dj,
                  cancelled_by_dj: reports.summary.cancelled_by_dj,
                }}
              />
            </div>
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
                <DashboardBreakdownPanel
                  title="Sittings by courthouse"
                  labelHeader="Courthouse"
                  rows={reports.by_courthouse.map((row) => ({
                    key: row.courthouse,
                    label: row.courthouse,
                    value: row.sittings,
                  }))}
                  periodFilter={periodFilter}
                  periodLabel={periodTag}
                  filterForRow={(row) => ({ courthouse: row.label })}
                  emptyMessage="No sitting data yet."
                />
              </div>
              <div className="govuk-grid-column-one-half">
                <DashboardBreakdownPanel
                  title="Sittings by court type"
                  labelHeader="Court type"
                  rows={reports.by_court_type.map((row) => ({
                    key: row.court_type,
                    label: row.court_type,
                    value: row.sittings,
                  }))}
                  periodFilter={periodFilter}
                  periodLabel={periodTag}
                  filterForRow={(row) => ({ court_type: row.label })}
                  emptyMessage="No court type data yet."
                />
              </div>
            </div>

            <DashboardBreakdownPanel
              title="Business types (Remands, Trials, etc.)"
              labelHeader="Type"
              rows={reports.by_sitting_type.map((row) => ({
                key: row.sitting_type,
                label: row.sitting_type,
                value: row.sittings,
              }))}
              periodFilter={periodFilter}
              periodLabel={periodTag}
              filterForRow={(row) => ({ sitting_type: row.label })}
              emptyMessage="No sitting types recorded yet."
            />

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
              <ChartTableToggle
                tableCaption="Away from home court"
                hasData={reports.away_from_home.length > 0}
                chart={
                  <HorizontalBarChart
                    rows={reports.away_from_home.map((row) => ({
                      key: String(row.magistrate_id),
                      label: row.magistrate,
                      value: row.away_sittings,
                      colour:
                        row.away_sittings >= 10
                          ? "#d4351c"
                          : row.away_sittings >= 5
                            ? "#f47738"
                            : undefined,
                    }))}
                    emptyMessage="No cross-court movement recorded yet."
                    summaryContext="away sittings by magistrate"
                    summaryId={awayFromHomeSummaryId}
                  />
                }
                table={
                  <>
                    <thead className="govuk-table__head">
                      <tr className="govuk-table__row">
                        <SortableTableHeader columnKey="magistrate" sort={awaySort} onSort={toggleAwaySort}>
                          Magistrate
                        </SortableTableHeader>
                        <SortableTableHeader columnKey="away_sittings" sort={awaySort} onSort={toggleAwaySort}>
                          Away sittings
                        </SortableTableHeader>
                      </tr>
                    </thead>
                    <tbody className="govuk-table__body">
                      {sortedAwayFromHome.map((row) => {
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
                  </>
                }
              />
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
              <ChartTableToggle
                tableCaption="Commitment forecast"
                hasData={reports.commitment_forecast.length > 0}
                chart={
                  <HorizontalBarChart
                    rows={commitmentRiskRows(reports.commitment_forecast)}
                    emptyMessage="No commitment forecast data."
                    summaryContext="commitment risk levels"
                    summaryId={commitmentRiskSummaryId}
                  />
                }
                table={
                  <>
                    <thead className="govuk-table__head">
                      <tr className="govuk-table__row">
                        <SortableTableHeader
                          columnKey="display_name"
                          sort={commitmentSort}
                          onSort={toggleCommitmentSort}
                        >
                          Magistrate
                        </SortableTableHeader>
                        <SortableTableHeader columnKey="risk_level" sort={commitmentSort} onSort={toggleCommitmentSort}>
                          Risk
                        </SortableTableHeader>
                        <SortableTableHeader columnKey="projected" sort={commitmentSort} onSort={toggleCommitmentSort}>
                          Projected
                        </SortableTableHeader>
                        <SortableTableHeader
                          columnKey="completion_rate"
                          sort={commitmentSort}
                          onSort={toggleCommitmentSort}
                        >
                          Completion rate
                        </SortableTableHeader>
                      </tr>
                    </thead>
                    <tbody className="govuk-table__body">
                      {sortedCommitmentForecast.map((row) => {
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
                  </>
                }
              />
            </DashboardSection>
          ) : null}

          <p className="govuk-body govuk-hint">{reports.note}</p>
        </>
      ) : null}
    </>
  );
}
