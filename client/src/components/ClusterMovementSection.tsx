import { useId, useMemo } from "react";
import { MagistrateLink } from "./MagistrateLink";
import { DashboardSection } from "./DashboardSection";
import { DashboardStatPanel, dashboardStatValue } from "./DashboardStatPanel";
import { SortableTableHeader } from "./SortableTableHeader";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { SimpleBreakdownTable } from "./charts/SimpleBreakdownTable";
import { ViewChartButton } from "./charts/ViewChartButton";
import { SimpleDonut, homeAwaySegments } from "./charts/SimpleDonut";
import { useTableSort } from "../lib/useTableSort";
import type { HomeCourtMovementReport } from "../types/domain";

interface ClusterMovementSectionProps {
  report: HomeCourtMovementReport;
}

function cellClass(homeCourthouse: string, sittingCourthouse: string, count: number, maxOffDiagonal: number) {
  if (count === 0) return "";
  if (homeCourthouse === sittingCourthouse) return "govuk-!-font-weight-bold";
  if (maxOffDiagonal > 0 && count >= maxOffDiagonal * 0.5) return "govuk-tag govuk-tag--yellow";
  return "";
}

export function ClusterMovementSection({ report }: ClusterMovementSectionProps) {
  const { summary, courthouses, by_home_court, matrix, flags } = report;
  const homeAwaySummaryId = useId();
  const awayByHomeCourtSummaryId = useId();
  const homeCourtTotalSummaryId = useId();

  const maxOffDiagonal = matrix.reduce((max, row) => {
    const rowMax = courthouses.reduce((innerMax, courthouse) => {
      if (courthouse === row.home_courthouse) return innerMax;
      return Math.max(innerMax, row.cells[courthouse] ?? 0);
    }, 0);
    return Math.max(max, rowMax);
  }, 0);

  const barnsleyZero = flags.zero_completed_sittings.filter((row) => row.home_courthouse === "Barnsley");

  const homeCourtSortColumns = useMemo(
    () => ({
      home_courthouse: { getValue: (row: (typeof by_home_court)[number]) => row.home_courthouse },
      magistrates: { getValue: (row: (typeof by_home_court)[number]) => row.magistrates, type: "number" as const },
      completed_at_home: {
        getValue: (row: (typeof by_home_court)[number]) => row.completed_at_home,
        type: "number" as const,
      },
      completed_away: {
        getValue: (row: (typeof by_home_court)[number]) => row.completed_away,
        type: "number" as const,
      },
      completed_total: {
        getValue: (row: (typeof by_home_court)[number]) => row.completed_total,
        type: "number" as const,
      },
      away_pct: { getValue: (row: (typeof by_home_court)[number]) => row.away_pct, type: "number" as const },
    }),
    []
  );
  const {
    sort: homeCourtSort,
    toggleSort: toggleHomeCourtSort,
    sortedData: sortedByHomeCourt,
  } = useTableSort(by_home_court, homeCourtSortColumns, { key: "completed_total", direction: "desc" });

  const matrixSortColumns = useMemo(() => {
    const columns: Record<string, { getValue: (row: (typeof matrix)[number]) => unknown; type?: "number" | "string" }> =
      {
        home_courthouse: { getValue: (row) => row.home_courthouse },
        total: { getValue: (row) => row.total, type: "number" },
      };
    for (const courthouse of courthouses) {
      columns[courthouse] = {
        getValue: (row) => row.cells[courthouse] ?? 0,
        type: "number",
      };
    }
    return columns;
  }, [courthouses]);
  const {
    sort: matrixSort,
    toggleSort: toggleMatrixSort,
    sortedData: sortedMatrix,
  } = useTableSort(matrix, matrixSortColumns, { key: "home_courthouse", direction: "asc" });

  const sheffieldSortColumns = useMemo(
    () => ({
      magistrate: { getValue: (row: (typeof flags.sheffield_at_barnsley)[number]) => row.magistrate },
      barnsley_sittings: {
        getValue: (row: (typeof flags.sheffield_at_barnsley)[number]) => row.barnsley_sittings,
        type: "number" as const,
      },
      total_completed: {
        getValue: (row: (typeof flags.sheffield_at_barnsley)[number]) => row.total_completed,
        type: "number" as const,
      },
      barnsley_pct: {
        getValue: (row: (typeof flags.sheffield_at_barnsley)[number]) => row.barnsley_pct,
        type: "number" as const,
      },
    }),
    []
  );
  const {
    sort: sheffieldSort,
    toggleSort: toggleSheffieldSort,
    sortedData: sortedSheffield,
  } = useTableSort(flags.sheffield_at_barnsley, sheffieldSortColumns, {
    key: "barnsley_sittings",
    direction: "desc",
  });

  const zeroSittingSortColumns = useMemo(
    () => ({
      magistrate: { getValue: (row: (typeof flags.zero_completed_sittings)[number]) => row.magistrate },
      home_courthouse: {
        getValue: (row: (typeof flags.zero_completed_sittings)[number]) => row.home_courthouse,
      },
    }),
    []
  );
  const {
    sort: zeroSittingSort,
    toggleSort: toggleZeroSittingSort,
    sortedData: sortedZeroSittings,
  } = useTableSort(flags.zero_completed_sittings, zeroSittingSortColumns, {
    key: "home_courthouse",
    direction: "asc",
  });

  return (
    <DashboardSection
      title="Movement across the cluster"
      tag={`${summary.away_pct}% away`}
      tagColour={summary.away_pct >= 30 ? "yellow" : "grey"}
      description="Fiscal-year completed sittings by home court and sitting location (off-diagonal cells are away sittings)."
    >
      <DashboardStatPanel
        cols={4}
        items={[
          { label: "Completed sittings", value: dashboardStatValue(summary.total_completed_sittings) },
          { label: "At home court", tone: "green", value: dashboardStatValue(summary.completed_at_home) },
          { label: "Away from home", tone: "yellow", value: dashboardStatValue(summary.completed_away) },
          {
            label: "Away %",
            value:
              summary.away_pct === 0 ? (
                <span className="orion-dashboard-stat__zero">0%</span>
              ) : (
                `${summary.away_pct}%`
              ),
          },
        ]}
      />

      {summary.magistrates_missing_home_court > 0 && (
        <p className="orion-dashboard-footnote">
          {summary.magistrates_missing_home_court} magistrate
          {summary.magistrates_missing_home_court === 1 ? "" : "s"} without a recorded home court are excluded from
          this analysis.
        </p>
      )}

      <div className="govuk-grid-row govuk-!-margin-bottom-4">
        <div className="govuk-grid-column-one-half">
          <div className="orion-dashboard-subsection">
            <h3 className="govuk-heading-s orion-dashboard-subsection__title">At home vs away</h3>
            <ViewChartButton
              title="At home vs away"
              chart={
                <SimpleDonut
                  segments={homeAwaySegments(summary.completed_at_home, summary.completed_away)}
                  centreLabel={`${summary.away_pct}% away`}
                  summaryContext="completed sittings"
                  summaryId={homeAwaySummaryId}
                  emptyMessage="No completed sittings recorded."
                />
              }
            />
            <SimpleBreakdownTable
              caption="At home vs away"
              labelHeader="Location"
              valueHeader="Completed sittings"
              rows={[
                { label: "At home court", value: summary.completed_at_home },
                { label: "Away from home", value: summary.completed_away },
              ]}
              emptyMessage="No completed sittings recorded."
            />
          </div>
        </div>
        <div className="govuk-grid-column-one-half">
          <div className="orion-dashboard-subsection">
            <h3 className="govuk-heading-s orion-dashboard-subsection__title">Away sittings by home court</h3>
            {by_home_court.length === 0 ? (
              <p className="govuk-body">No movement data yet.</p>
            ) : (
              <>
                <ViewChartButton
                  title="Away sittings by home court"
                  chart={
                    <HorizontalBarChart
                      rows={by_home_court.map((row) => ({
                        key: row.home_courthouse,
                        label: row.home_courthouse,
                        value: row.completed_away,
                      }))}
                      emptyMessage="No movement data yet."
                      summaryContext="away sittings by home court"
                      summaryId={awayByHomeCourtSummaryId}
                    />
                  }
                />
                <SimpleBreakdownTable
                  caption="Away sittings by home court"
                  labelHeader="Home court"
                  valueHeader="Away sittings"
                  rows={by_home_court.map((row) => ({
                    label: row.home_courthouse,
                    value: row.completed_away,
                  }))}
                  emptyMessage="No movement data yet."
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="orion-dashboard-subsection">
        <h3 className="govuk-heading-s orion-dashboard-subsection__title">Home court summary</h3>
        {by_home_court.length === 0 ? (
          <p className="govuk-body">No movement data yet.</p>
        ) : (
          <ChartTableToggle
            tableCaption="Home court summary"
            hasData={by_home_court.length > 0}
            chart={
              <HorizontalBarChart
                rows={by_home_court.map((row) => ({
                  key: `${row.home_courthouse}-total`,
                  label: row.home_courthouse,
                  value: row.completed_total,
                }))}
                emptyMessage="No movement data yet."
                summaryContext="completed sittings by home court"
                summaryId={homeCourtTotalSummaryId}
              />
            }
            table={
              <>
                <thead className="govuk-table__head">
                  <tr className="govuk-table__row">
                    <SortableTableHeader
                      columnKey="home_courthouse"
                      sort={homeCourtSort}
                      onSort={toggleHomeCourtSort}
                    >
                      Home court
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="magistrates" sort={homeCourtSort} onSort={toggleHomeCourtSort}>
                      Magistrates
                    </SortableTableHeader>
                    <SortableTableHeader
                      columnKey="completed_at_home"
                      sort={homeCourtSort}
                      onSort={toggleHomeCourtSort}
                    >
                      At home
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="completed_away" sort={homeCourtSort} onSort={toggleHomeCourtSort}>
                      Away
                    </SortableTableHeader>
                    <SortableTableHeader
                      columnKey="completed_total"
                      sort={homeCourtSort}
                      onSort={toggleHomeCourtSort}
                    >
                      Total
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="away_pct" sort={homeCourtSort} onSort={toggleHomeCourtSort}>
                      Away %
                    </SortableTableHeader>
                  </tr>
                </thead>
                <tbody className="govuk-table__body">
                  {sortedByHomeCourt.map((row) => (
                    <tr key={row.home_courthouse} className="govuk-table__row">
                      <th scope="row" className="govuk-table__header">
                        {row.home_courthouse}
                      </th>
                      <td className="govuk-table__cell">{row.magistrates}</td>
                      <td className="govuk-table__cell">{row.completed_at_home}</td>
                      <td className="govuk-table__cell">{row.completed_away}</td>
                      <td className="govuk-table__cell">{row.completed_total}</td>
                      <td className="govuk-table__cell">{row.away_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </>
            }
          />
        )}
      </div>

      <div className="orion-dashboard-subsection">
        <h3 className="govuk-heading-s orion-dashboard-subsection__title">Movement matrix</h3>
        <p className="govuk-body govuk-hint">Rows = magistrate home court. Columns = where they sat.</p>
        {matrix.length === 0 ? (
          <p className="govuk-body">No movement data yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <SortableTableHeader
                    columnKey="home_courthouse"
                    sort={matrixSort}
                    onSort={toggleMatrixSort}
                  >
                    Home → Sitting
                  </SortableTableHeader>
                  {courthouses.map((courthouse) => (
                    <SortableTableHeader
                      key={courthouse}
                      columnKey={courthouse}
                      sort={matrixSort}
                      onSort={toggleMatrixSort}
                    >
                      {courthouse}
                    </SortableTableHeader>
                  ))}
                  <SortableTableHeader columnKey="total" sort={matrixSort} onSort={toggleMatrixSort}>
                    Total
                  </SortableTableHeader>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {sortedMatrix.map((row) => (
                  <tr key={row.home_courthouse} className="govuk-table__row">
                    <th scope="row" className="govuk-table__header">
                      {row.home_courthouse}
                    </th>
                    {courthouses.map((courthouse) => {
                      const count = row.cells[courthouse] ?? 0;
                      const highlight = cellClass(row.home_courthouse, courthouse, count, maxOffDiagonal);
                      return (
                        <td key={courthouse} className="govuk-table__cell">
                          {highlight ? <span className={highlight}>{count}</span> : count}
                        </td>
                      );
                    })}
                    <td className="govuk-table__cell govuk-!-font-weight-bold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {flags.sheffield_at_barnsley.length > 0 && (
        <div className="orion-dashboard-subsection">
          <h3 className="govuk-heading-s orion-dashboard-subsection__title">
            Sheffield magistrates sitting at Barnsley
          </h3>
          <p className="govuk-body govuk-hint">
            Flagged when 2+ completed sittings at Barnsley, or 30%+ of completed sittings at Barnsley.
          </p>
          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="magistrate" sort={sheffieldSort} onSort={toggleSheffieldSort}>
                  Magistrate
                </SortableTableHeader>
                <SortableTableHeader
                  columnKey="barnsley_sittings"
                  sort={sheffieldSort}
                  onSort={toggleSheffieldSort}
                >
                  Barnsley sittings
                </SortableTableHeader>
                <SortableTableHeader columnKey="total_completed" sort={sheffieldSort} onSort={toggleSheffieldSort}>
                  Total completed
                </SortableTableHeader>
                <SortableTableHeader columnKey="barnsley_pct" sort={sheffieldSort} onSort={toggleSheffieldSort}>
                  Barnsley %
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedSheffield.map((row) => (
                <tr key={row.magistrate_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                  </td>
                  <td className="govuk-table__cell">
                    <strong className="govuk-tag govuk-tag--yellow">{row.barnsley_sittings}</strong>
                  </td>
                  <td className="govuk-table__cell">{row.total_completed}</td>
                  <td className="govuk-table__cell">{row.barnsley_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {flags.zero_completed_sittings.length > 0 && (
        <div className="orion-dashboard-subsection">
          <h3 className="govuk-heading-s orion-dashboard-subsection__title">
            Active magistrates with no completed sittings
          </h3>
          {barnsleyZero.length > 0 && (
            <p className="govuk-body">
              <strong className="govuk-tag govuk-tag--red">{barnsleyZero.length}</strong> Barnsley-home magistrate
              {barnsleyZero.length === 1 ? "" : "s"} with zero completed sittings this fiscal year.
            </p>
          )}
          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="magistrate" sort={zeroSittingSort} onSort={toggleZeroSittingSort}>
                  Magistrate
                </SortableTableHeader>
                <SortableTableHeader
                  columnKey="home_courthouse"
                  sort={zeroSittingSort}
                  onSort={toggleZeroSittingSort}
                >
                  Home court
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedZeroSittings.map((row) => (
                <tr key={row.magistrate_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                  </td>
                  <td className="govuk-table__cell">
                    {row.home_courthouse === "Barnsley" ? (
                      <strong className="govuk-tag govuk-tag--red">{row.home_courthouse}</strong>
                    ) : (
                      row.home_courthouse
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  );
}
