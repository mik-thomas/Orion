import { useEffect, useId, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";
import { ComplianceViolations } from "../components/ComplianceViolations";
import { RetirementDueModal } from "../components/RetirementDueModal";
import { SittingForecastPanel } from "../components/SittingForecastPanel";
import { SittingScoreMeter } from "../components/SittingScoreMeter";
import { LoaReviewDateEditor } from "../components/LoaReviewDateEditor";
import { NextLoaReviewTag } from "../lib/loaReview";
import { DjCancellationSection } from "../components/DjCancellationSection";
import { PeriodFilter } from "../components/PeriodFilter";
import { SittingHistoryChart } from "../components/SittingHistoryChart";
import { DashboardSection } from "../components/DashboardSection";
import { DonutOrBarChart } from "../components/charts/DonutOrBarChart";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { ShowTableToggle } from "../components/charts/ShowTableToggle";
import { SimpleBreakdownTable } from "../components/charts/SimpleBreakdownTable";
import { SittingStatusTable } from "../components/charts/SittingStatusTable";
import { ViewChartButton } from "../components/charts/ViewChartButton";
import { homeAwaySegments, SimpleDonut } from "../components/charts/SimpleDonut";
import { courtRoomStackRow, StackedBarChart } from "../components/charts/StackedBarChart";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { SortableTwoColumnTable } from "../components/SortableTwoColumnTable";
import { useTableSort } from "../lib/useTableSort";
import { useRole } from "../context/RoleContext";
import {
  defaultProfilePeriodFilter,
  parsePeriodFilterSearch,
  periodFilterLabel,
  periodFilterQuery,
  type PeriodFilterState,
} from "../lib/periodFilter";
import { SittingPositionCell } from "../lib/sittingPosition";
import { SittingStatusCell } from "../lib/sittingStatus";
import { isRetirementAlertDismissed, isRetiringSoon } from "../lib/retirement";
import type { CourtRoomRow, LeaveOfAbsence, MagistrateDetail } from "../types/domain";

function ProfileCourtRoomBreakdownTable({ rows }: { rows: CourtRoomRow[] }) {
  const sortColumns = useMemo(
    () => ({
      courthouse: { getValue: (row: CourtRoomRow) => row.courthouse },
      court_room: { getValue: (row: CourtRoomRow) => row.court_room },
      sittings: { getValue: (row: CourtRoomRow) => row.sittings, type: "number" as const },
      completed: { getValue: (row: CourtRoomRow) => row.completed, type: "number" as const },
      vacated: { getValue: (row: CourtRoomRow) => row.vacated, type: "number" as const },
      cancelled: { getValue: (row: CourtRoomRow) => row.cancelled, type: "number" as const },
      cancelled_by_dj: { getValue: (row: CourtRoomRow) => row.cancelled_by_dj, type: "number" as const },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(rows, sortColumns, {
    key: "sittings",
    direction: "desc",
  });

  return (
    <>
      <thead className="govuk-table__head">
        <tr className="govuk-table__row">
          <SortableTableHeader columnKey="courthouse" sort={sort} onSort={toggleSort}>
            Courthouse
          </SortableTableHeader>
          <SortableTableHeader columnKey="court_room" sort={sort} onSort={toggleSort}>
            Court room
          </SortableTableHeader>
          <SortableTableHeader columnKey="sittings" sort={sort} onSort={toggleSort}>
            Total
          </SortableTableHeader>
          <SortableTableHeader columnKey="completed" sort={sort} onSort={toggleSort}>
            Completed
          </SortableTableHeader>
          <SortableTableHeader columnKey="vacated" sort={sort} onSort={toggleSort}>
            Vacated
          </SortableTableHeader>
          <SortableTableHeader columnKey="cancelled" sort={sort} onSort={toggleSort}>
            Cancelled
          </SortableTableHeader>
          <SortableTableHeader columnKey="cancelled_by_dj" sort={sort} onSort={toggleSort}>
            Cancelled by DJ
          </SortableTableHeader>
        </tr>
      </thead>
      <tbody className="govuk-table__body">
        {sortedData.map((row) => (
          <tr key={`${row.courthouse}-${row.court_room}`} className="govuk-table__row">
            <td className="govuk-table__cell">{row.courthouse}</td>
            <td className="govuk-table__cell">{row.court_room}</td>
            <td className="govuk-table__cell">{row.sittings}</td>
            <td className="govuk-table__cell">{row.completed}</td>
            <td className="govuk-table__cell">{row.vacated}</td>
            <td className="govuk-table__cell">{row.cancelled}</td>
            <td className="govuk-table__cell">{row.cancelled_by_dj}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

export function MagistrateProfilePage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, canViewNames } = useRole();
  const [magistrate, setMagistrate] = useState<MagistrateDetail | null>(null);
  const periodFilter = useMemo(
    () => parsePeriodFilterSearch(searchParams.toString(), defaultProfilePeriodFilter()),
    [searchParams]
  );
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRetirementModal, setShowRetirementModal] = useState(false);
  const statusSummaryId = useId();
  const homeAwaySummaryId = useId();
  const locationSummaryId = useId();
  const courtTypeSummaryId = useId();
  const sittingTypeSummaryId = useId();
  const courtRoomSummaryId = useId();

  function handlePeriodChange(next: PeriodFilterState) {
    setSearchParams(new URLSearchParams(periodFilterQuery(next)), { replace: true });
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMagistrate(Number(id), periodFilterQuery(periodFilter))
      .then((data) => {
        setMagistrate(data);
        if (data.available_fiscal_years) {
          setAvailableYears(data.available_fiscal_years);
        }
        const shouldAlert =
          isRetiringSoon(data.retirement_on) && !isRetirementAlertDismissed(data.id);
        setShowRetirementModal(shouldAlert);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id, periodFilter, role]);

  function handleLeaveUpdated(updated: LeaveOfAbsence) {
    setMagistrate((current) =>
      current
        ? {
            ...current,
            leaves_of_absence: current.leaves_of_absence.map((leave) =>
              leave.id === updated.id ? updated : leave
            ),
          }
        : current
    );
  }

  const sittings = magistrate?.sittings ?? [];
  const leavesOfAbsence = magistrate?.leaves_of_absence ?? [];
  const cases = magistrate?.cases ?? [];

  const sittingSortColumns = useMemo(
    () => ({
      session_date: { getValue: (row: (typeof sittings)[number]) => row.session_date, type: "date" as const },
      session: { getValue: (row: (typeof sittings)[number]) => row.session ?? "" },
      location: {
        getValue: (row: (typeof sittings)[number]) =>
          `${row.courthouse.name}${row.away_from_home_court ? " (away)" : ""}`,
      },
      court_room: { getValue: (row: (typeof sittings)[number]) => row.court_room ?? "" },
      sitting_type: { getValue: (row: (typeof sittings)[number]) => row.sitting_type.name },
      court_type: { getValue: (row: (typeof sittings)[number]) => row.court_type ?? "" },
      sitting_position: { getValue: (row: (typeof sittings)[number]) => row.sitting_position ?? "" },
      status: { getValue: (row: (typeof sittings)[number]) => row.status },
    }),
    []
  );
  const {
    sort: sittingSort,
    toggleSort: toggleSittingSort,
    sortedData: sortedSittings,
  } = useTableSort(sittings, sittingSortColumns, { key: "session_date", direction: "desc" });

  const leaveSortColumns = useMemo(
    () => ({
      starts_on: { getValue: (row: (typeof leavesOfAbsence)[number]) => row.starts_on, type: "date" as const },
      ends_on: { getValue: (row: (typeof leavesOfAbsence)[number]) => row.ends_on ?? "Open-ended" },
      reason: { getValue: (row: (typeof leavesOfAbsence)[number]) => row.reason ?? "" },
      review_on: {
        getValue: (row: (typeof leavesOfAbsence)[number]) => row.next_loa_review_on ?? "",
        type: "date" as const,
      },
      status: { getValue: (row: (typeof leavesOfAbsence)[number]) => (row.active ? 1 : 0), type: "number" as const },
    }),
    []
  );
  const {
    sort: leaveSort,
    toggleSort: toggleLeaveSort,
    sortedData: sortedLeaves,
  } = useTableSort(leavesOfAbsence, leaveSortColumns, { key: "starts_on", direction: "desc" });

  const caseSortColumns = useMemo(
    () => ({
      reference: { getValue: (row: (typeof cases)[number]) => row.reference ?? "" },
      title: { getValue: (row: (typeof cases)[number]) => row.title },
      status: { getValue: (row: (typeof cases)[number]) => row.status },
      notes_count: { getValue: (row: (typeof cases)[number]) => row.notes_count, type: "number" as const },
    }),
    []
  );
  const {
    sort: caseSort,
    toggleSort: toggleCaseSort,
    sortedData: sortedCases,
  } = useTableSort(cases, caseSortColumns, { key: "reference", direction: "asc" });

  if (loading) return <p className="govuk-body">Loading…</p>;
  if (error || !magistrate) {
    return (
      <div className="govuk-error-summary" role="alert">
        <h2 className="govuk-error-summary__title">There is a problem</h2>
        <div className="govuk-error-summary__body">
          <p className="govuk-body">{error ?? "Magistrate not found"}</p>
        </div>
      </div>
    );
  }

  const periodLabel = magistrate.period?.label ?? periodFilterLabel(periodFilter);
  const summary = magistrate.sitting_summary;

  return (
    <>
      {magistrate.retirement_on && isRetiringSoon(magistrate.retirement_on) ? (
        <RetirementDueModal
          magistrateId={magistrate.id}
          retirementOn={magistrate.retirement_on}
          open={showRetirementModal}
          onDismiss={() => setShowRetirementModal(false)}
        />
      ) : null}

      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <Link to="/magistrates" className="govuk-breadcrumbs__link">
              Magistrates
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            {magistrate.display_name}
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">{magistrate.display_name}</h1>
      {!canViewNames && (
        <p className="govuk-body-l">
          Reference <strong>{magistrate.reference_code}</strong> — personal details are hidden for your role.
        </p>
      )}

      <ComplianceViolations
        violations={magistrate.violations}
        sittingCommitment={magistrate.sitting_commitment}
      />

      <SittingScoreMeter sittingScore={magistrate.sitting_score} />

      <SittingForecastPanel forecast={magistrate.sitting_forecast} />

      {magistrate.active_leave && (
        <div className="govuk-notification-banner govuk-notification-banner--warning" role="region">
          <div className="govuk-notification-banner__header">
            <h2 className="govuk-notification-banner__title">Leave of absence in place</h2>
          </div>
          <div className="govuk-notification-banner__content">
            <p className="govuk-notification-banner__heading">Check current leave dates before assigning sittings.</p>
            <ul className="govuk-list govuk-!-margin-top-2">
              {magistrate.current_leaves.map((leave) => (
                <li key={leave.id}>
                  {leave.starts_on} to {leave.ends_on ?? "open-ended"}
                  {leave.reason ? ` — ${leave.reason}` : ""}
                  {" — next review: "}
                  <NextLoaReviewTag leave={leave} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <dl className="govuk-summary-list">
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Reference code</dt>
          <dd className="govuk-summary-list__value">{magistrate.reference_code}</dd>
        </div>
        {canViewNames && magistrate.full_name && (
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Full name</dt>
            <dd className="govuk-summary-list__value">{magistrate.full_name}</dd>
          </div>
        )}
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Cluster / bench</dt>
          <dd className="govuk-summary-list__value">
            {magistrate.cluster} / {magistrate.bench}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Appraisal</dt>
          <dd className="govuk-summary-list__value">
            {magistrate.appraisal_status ?? "Not recorded"}
            {magistrate.appraisal_cycle_years ? ` — every ${magistrate.appraisal_cycle_years} years` : ""}
            {magistrate.presiding_justice ? " (Presiding Justice)" : " (Winger)"}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Date of appointment</dt>
          <dd className="govuk-summary-list__value">{magistrate.date_of_appointment ?? "Not recorded"}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Retirement date</dt>
          <dd className="govuk-summary-list__value">
            {magistrate.retirement_on ? (
              isRetiringSoon(magistrate.retirement_on) ? (
                <strong className="govuk-tag govuk-tag--yellow">{magistrate.retirement_on}</strong>
              ) : (
                magistrate.retirement_on
              )
            ) : (
              "Not recorded"
            )}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Home court</dt>
          <dd className="govuk-summary-list__value">{magistrate.home_courthouse?.name ?? "Not recorded"}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Sitting locations</dt>
          <dd className="govuk-summary-list__value">
            {magistrate.sitting_locations.length > 0
              ? magistrate.sitting_locations.map((court) => court.name).join(", ")
              : "None recorded"}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Reasonable adjustments</dt>
          <dd className="govuk-summary-list__value">
            {magistrate.reasonable_adjustments ?? "None recorded"}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Last rota login</dt>
          <dd className="govuk-summary-list__value">{magistrate.last_login_on ?? "Not recorded"}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Days since login</dt>
          <dd className="govuk-summary-list__value">
            {magistrate.days_since_login != null ? (
              magistrate.days_since_login >= 90 ? (
                <strong className="govuk-tag govuk-tag--red">{magistrate.days_since_login}</strong>
              ) : magistrate.days_since_login >= 30 ? (
                <strong className="govuk-tag govuk-tag--yellow">{magistrate.days_since_login}</strong>
              ) : (
                magistrate.days_since_login
              )
            ) : (
              "Not recorded"
            )}
          </dd>
        </div>
      </dl>

      <h2 className="govuk-heading-l">Sittings</h2>
      <PeriodFilter
        value={periodFilter}
        onChange={handlePeriodChange}
        availableYears={availableYears}
      />

      <>
            <div className="orion-profile-charts-grid orion-profile-charts-grid--two">
              <DashboardSection
                title="Sitting status"
                headingLevel={3}
                description={`Outcome breakdown for ${periodLabel}.`}
              >
                <ViewChartButton
                  title="Sitting status"
                  chart={
                    <DonutOrBarChart
                      totals={summary.totals}
                      summaryContext={periodLabel}
                      summaryId={statusSummaryId}
                    />
                  }
                />
                <SittingStatusTable caption="Sitting status" totals={summary.totals} />
              </DashboardSection>

              {summary.home_away ? (
                <DashboardSection
                  title="Home / away"
                  headingLevel={3}
                  description={`Completed sittings at home court vs away for ${periodLabel}.`}
                >
                  <ViewChartButton
                    title="Home / away"
                    chart={
                      <SimpleDonut
                        segments={homeAwaySegments(summary.home_away.at_home, summary.home_away.away)}
                        centreLabel={`${summary.home_away.away_pct}% away`}
                        summaryContext={periodLabel}
                        summaryId={homeAwaySummaryId}
                        emptyMessage="No completed sittings recorded."
                      />
                    }
                  />
                  <SimpleBreakdownTable
                    caption="Home / away"
                    labelHeader="Location"
                    valueHeader="Completed sittings"
                    rows={[
                      { label: "At home court", value: summary.home_away.at_home },
                      { label: "Away from home", value: summary.home_away.away },
                    ]}
                    emptyMessage="No completed sittings recorded."
                  />
                </DashboardSection>
              ) : null}
            </div>

            <div className="orion-profile-charts-grid orion-profile-charts-grid--three">
              <DashboardSection
                title="By location"
                headingLevel={3}
                description={`Sittings by courthouse for ${periodLabel}.`}
              >
                <ShowTableToggle
                  tableCaption="Sittings by location"
                  hasData={summary.by_location.length > 0}
                  table={
                    <SortableTwoColumnTable
                      rows={summary.by_location}
                      rowKey={(row) => row.courthouse}
                      labelHeader="Courthouse"
                      getLabel={(row) => row.courthouse}
                      getLabelSortValue={(row) => row.courthouse}
                      getValue={(row) => row.sittings}
                    />
                  }
                >
                  <HorizontalBarChart
                    rows={summary.by_location.map((row) => ({
                      key: row.courthouse,
                      label: row.courthouse,
                      value: row.sittings,
                    }))}
                    emptyMessage="No sittings recorded."
                    summaryContext={periodLabel}
                    summaryId={locationSummaryId}
                  />
                </ShowTableToggle>
              </DashboardSection>

              <DashboardSection
                title="By court type"
                headingLevel={3}
                description={`Sittings by court type for ${periodLabel}.`}
              >
                <ShowTableToggle
                  tableCaption="Sittings by court type"
                  hasData={summary.by_court_type.length > 0}
                  table={
                    <SortableTwoColumnTable
                      rows={summary.by_court_type}
                      rowKey={(row) => row.court_type}
                      labelHeader="Court type"
                      getLabel={(row) => row.court_type}
                      getLabelSortValue={(row) => row.court_type}
                      getValue={(row) => row.sittings}
                    />
                  }
                >
                  <HorizontalBarChart
                    rows={summary.by_court_type.map((row) => ({
                      key: row.court_type,
                      label: row.court_type,
                      value: row.sittings,
                    }))}
                    emptyMessage="No court types recorded."
                    summaryContext={periodLabel}
                    summaryId={courtTypeSummaryId}
                  />
                </ShowTableToggle>
              </DashboardSection>

              <DashboardSection
                title="By sitting type"
                headingLevel={3}
                description={`Sittings by type for ${periodLabel}.`}
              >
                <ShowTableToggle
                  tableCaption="Sittings by sitting type"
                  hasData={summary.by_sitting_type.length > 0}
                  table={
                    <SortableTwoColumnTable
                      rows={summary.by_sitting_type}
                      rowKey={(row) => row.sitting_type}
                      labelHeader="Type"
                      getLabel={(row) => row.sitting_type}
                      getLabelSortValue={(row) => row.sitting_type}
                      getValue={(row) => row.sittings}
                    />
                  }
                >
                  <HorizontalBarChart
                    rows={summary.by_sitting_type.map((row) => ({
                      key: row.sitting_type,
                      label: row.sitting_type,
                      value: row.sittings,
                    }))}
                    emptyMessage="No sitting types recorded."
                    summaryContext={periodLabel}
                    summaryId={sittingTypeSummaryId}
                  />
                </ShowTableToggle>
              </DashboardSection>
            </div>

            {summary.dj_cancellations.total > 0 && (
              <DjCancellationSection
                report={summary.dj_cancellations}
                heading="District Judge cancellations"
              />
            )}

            <DashboardSection
              title="Sittings by court room"
              headingLevel={3}
              description={`Completed, vacated and cancelled sittings by court room for ${periodLabel}.`}
            >
              <ShowTableToggle
                tableCaption="Sittings by court room"
                hasData={summary.by_court_room.length > 0}
                table={<ProfileCourtRoomBreakdownTable rows={summary.by_court_room} />}
              >
                <StackedBarChart
                  rows={summary.by_court_room.map((row) =>
                    courtRoomStackRow(row.courthouse, row.court_room, {
                      completed: row.completed,
                      vacated: row.vacated,
                      cancelled: row.cancelled,
                    })
                  )}
                  emptyMessage="No court room data for this magistrate."
                  summaryContext={periodLabel}
                  summaryId={courtRoomSummaryId}
                />
              </ShowTableToggle>
            </DashboardSection>

            <SittingHistoryChart sittings={magistrate.sittings} periodLabel={periodLabel} />
      </>

      {sittings.length === 0 ? (
        <p className="govuk-body">No individual sittings recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <SortableTableHeader columnKey="session_date" sort={sittingSort} onSort={toggleSittingSort}>
                Date
              </SortableTableHeader>
              <SortableTableHeader columnKey="session" sort={sittingSort} onSort={toggleSittingSort}>
                Session
              </SortableTableHeader>
              <SortableTableHeader columnKey="location" sort={sittingSort} onSort={toggleSittingSort}>
                Location
              </SortableTableHeader>
              <SortableTableHeader columnKey="court_room" sort={sittingSort} onSort={toggleSittingSort}>
                Court room
              </SortableTableHeader>
              <SortableTableHeader columnKey="sitting_type" sort={sittingSort} onSort={toggleSittingSort}>
                Type
              </SortableTableHeader>
              <SortableTableHeader columnKey="court_type" sort={sittingSort} onSort={toggleSittingSort}>
                Court type
              </SortableTableHeader>
              <SortableTableHeader columnKey="sitting_position" sort={sittingSort} onSort={toggleSittingSort}>
                Role
              </SortableTableHeader>
              <SortableTableHeader columnKey="status" sort={sittingSort} onSort={toggleSittingSort}>
                Status
              </SortableTableHeader>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {sortedSittings.map((sitting) => (
              <tr key={sitting.id} className="govuk-table__row">
                <td className="govuk-table__cell">{sitting.session_date}</td>
                <td className="govuk-table__cell">{sitting.session ?? "—"}</td>
                <td className="govuk-table__cell">
                  {sitting.courthouse.name}
                  {sitting.away_from_home_court ? " (away)" : ""}
                </td>
                <td className="govuk-table__cell">{sitting.court_room ?? "—"}</td>
                <td className="govuk-table__cell">{sitting.sitting_type.name}</td>
                <td className="govuk-table__cell">{sitting.court_type ?? "—"}</td>
                <td className="govuk-table__cell">
                  <SittingPositionCell sittingPosition={sitting.sitting_position} />
                </td>
                <td className="govuk-table__cell">
                  <SittingStatusCell sitting={sitting} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="govuk-heading-l">Leave of absence</h2>
      {leavesOfAbsence.length === 0 ? (
        <p className="govuk-body">No leave recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <SortableTableHeader columnKey="starts_on" sort={leaveSort} onSort={toggleLeaveSort}>
                From
              </SortableTableHeader>
              <SortableTableHeader columnKey="ends_on" sort={leaveSort} onSort={toggleLeaveSort}>
                To
              </SortableTableHeader>
              <SortableTableHeader columnKey="reason" sort={leaveSort} onSort={toggleLeaveSort}>
                Reason
              </SortableTableHeader>
              <SortableTableHeader columnKey="review_on" sort={leaveSort} onSort={toggleLeaveSort}>
                Next LOA review
              </SortableTableHeader>
              <SortableTableHeader columnKey="status" sort={leaveSort} onSort={toggleLeaveSort}>
                Status
              </SortableTableHeader>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {sortedLeaves.map((leave) => (
              <tr key={leave.id} className="govuk-table__row">
                <td className="govuk-table__cell">{leave.starts_on}</td>
                <td className="govuk-table__cell">{leave.ends_on ?? "Open-ended"}</td>
                <td className="govuk-table__cell">{leave.reason ?? "—"}</td>
                <td className="govuk-table__cell">
                  <LoaReviewDateEditor
                    leave={leave}
                    editable={leave.active}
                    onUpdated={handleLeaveUpdated}
                  />
                </td>
                <td className="govuk-table__cell">
                  {leave.active ? (
                    <strong className="govuk-tag govuk-tag--yellow">Active</strong>
                  ) : (
                    "Past"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="govuk-heading-l">Cases</h2>
      {cases.length === 0 ? (
        <p className="govuk-body">No cases recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <SortableTableHeader columnKey="reference" sort={caseSort} onSort={toggleCaseSort}>
                Reference
              </SortableTableHeader>
              <SortableTableHeader columnKey="title" sort={caseSort} onSort={toggleCaseSort}>
                Title
              </SortableTableHeader>
              <SortableTableHeader columnKey="status" sort={caseSort} onSort={toggleCaseSort}>
                Status
              </SortableTableHeader>
              <SortableTableHeader columnKey="notes_count" sort={caseSort} onSort={toggleCaseSort}>
                Notes
              </SortableTableHeader>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {sortedCases.map((kase) => (
              <tr key={kase.id} className="govuk-table__row">
                <td className="govuk-table__cell">{kase.reference ?? "—"}</td>
                <td className="govuk-table__cell">{kase.title}</td>
                <td className="govuk-table__cell">{kase.status}</td>
                <td className="govuk-table__cell">{kase.notes_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
