import { useEffect, useId, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";
import { ComplianceViolations } from "../components/ComplianceViolations";
import { OrionBreadcrumbs } from "../components/OrionBreadcrumbs";
import { RetirementDueModal } from "../components/RetirementDueModal";
import { SittingForecastPanel } from "../components/SittingForecastPanel";
import { SittingScoreMeter } from "../components/SittingScoreMeter";
import { LoaExtendEditor } from "../components/LoaExtendEditor";
import { LoaReviewDateEditor } from "../components/LoaReviewDateEditor";
import { LoaReturnEditor } from "../components/LoaReturnEditor";
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
import { createLeaveOfAbsence } from "../api/leaves";
import { createCase } from "../api/cases";
import { formatTaskDate } from "../lib/tasks";
import { useAuth } from "../context/AuthContext";
import {
  CasebookActionBar,
  CasebookMetaRow,
  CasebookSplit,
  CasebookTabPanel,
  CasebookTabs,
} from "../components/casebook/CasebookChrome";
import { MagistrateSidebar } from "../components/MagistrateSidebar";

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
  const { session } = useAuth();
  const [magistrate, setMagistrate] = useState<MagistrateDetail | null>(null);
  const periodFilter = useMemo(
    () => parsePeriodFilterSearch(searchParams.toString(), defaultProfilePeriodFilter()),
    [searchParams]
  );
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRetirementModal, setShowRetirementModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseSummary, setNewCaseSummary] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);
  const [loaStartsOn, setLoaStartsOn] = useState("");
  const [loaEndsOn, setLoaEndsOn] = useState("");
  const [loaReason, setLoaReason] = useState("");
  const [loaNotes, setLoaNotes] = useState("");
  const [loaReviewOn, setLoaReviewOn] = useState("");
  const [creatingLoa, setCreatingLoa] = useState(false);
  const [activeTab, setActiveTab] = useState("cases");
  const [showCreateCase, setShowCreateCase] = useState(false);
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

  function handleLeaveUpdated(_updated: LeaveOfAbsence) {
    if (!id) return;
    getMagistrate(Number(id), periodFilterQuery(periodFilter))
      .then(setMagistrate)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to refresh profile"));
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
      returned_on: {
        getValue: (row: (typeof leavesOfAbsence)[number]) => row.returned_on ?? "",
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
      public_id: { getValue: (row: (typeof cases)[number]) => row.public_id ?? "" },
      title: { getValue: (row: (typeof cases)[number]) => row.title },
      status: { getValue: (row: (typeof cases)[number]) => row.status },
      created_at: { getValue: (row: (typeof cases)[number]) => row.created_at, type: "date" as const },
      updated_at: { getValue: (row: (typeof cases)[number]) => row.updated_at, type: "date" as const },
    }),
    []
  );
  const {
    sort: caseSort,
    toggleSort: toggleCaseSort,
    sortedData: sortedCases,
  } = useTableSort(cases, caseSortColumns, { key: "updated_at", direction: "desc" });

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

      <OrionBreadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Magistrates", to: "/magistrates" },
          { label: magistrate.display_name },
        ]}
      />

      <CasebookSplit
        main={
          <>
            <h1 className="govuk-heading-xl csbk-page-title">{magistrate.display_name}</h1>
            <CasebookMetaRow>
              Reference: {magistrate.reference_code}
              {magistrate.date_of_appointment ? ` · Appointed: ${magistrate.date_of_appointment}` : ""}
              {magistrate.home_courthouse?.name ? ` · Home court: ${magistrate.home_courthouse.name}` : ""}
              {magistrate.active_leave ? " · On leave" : ""}
            </CasebookMetaRow>
            {!canViewNames && (
              <p className="govuk-body">
                Demo identity <strong>{magistrate.display_name}</strong> (
                <strong>{magistrate.reference_code}</strong>) — real names and emails are hidden for your
                role.
              </p>
            )}

            <CasebookActionBar
              actions={[
                ...(session
                  ? [
                      {
                        label: "Add case",
                        primary: true as const,
                        onClick: () => {
                          setActiveTab("cases");
                          setShowCreateCase(true);
                        },
                      },
                      {
                        label: "Add leave",
                        primary: true as const,
                        onClick: () => setActiveTab("leave"),
                      },
                    ]
                  : []),
                { label: "Sittings", onClick: () => setActiveTab("sittings") },
                { label: "Overview", onClick: () => setActiveTab("overview") },
              ]}
            />

            <ComplianceViolations
              violations={magistrate.violations}
              sittingCommitment={magistrate.sitting_commitment}
            />

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

            <CasebookTabs
              tabs={[
                { id: "cases", label: "Cases", count: cases.length },
                { id: "sittings", label: "Sittings", count: sittings.length },
                { id: "leave", label: "Leave", count: leavesOfAbsence.length },
                { id: "overview", label: "Overview" },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            <CasebookTabPanel id="overview" activeId={activeTab}>
              <SittingScoreMeter sittingScore={magistrate.sitting_score} />
              <SittingForecastPanel forecast={magistrate.sitting_forecast} />

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

      
            </CasebookTabPanel>

            <CasebookTabPanel id="sittings" activeId={activeTab}>
              <PeriodFilter
                value={periodFilter}
                onChange={handlePeriodChange}
                availableYears={availableYears}
              />
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
            </CasebookTabPanel>

            <CasebookTabPanel id="leave" activeId={activeTab}>
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
              <SortableTableHeader columnKey="returned_on" sort={leaveSort} onSort={toggleLeaveSort}>
                Returned
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
                <td className="govuk-table__cell">
                  <LoaExtendEditor leave={leave} onUpdated={handleLeaveUpdated} />
                </td>
                <td className="govuk-table__cell">{leave.reason ?? "—"}</td>
                <td className="govuk-table__cell">
                  <LoaReviewDateEditor
                    leave={leave}
                    editable={leave.active}
                    onUpdated={handleLeaveUpdated}
                  />
                </td>
                <td className="govuk-table__cell">
                  <LoaReturnEditor leave={leave} onUpdated={handleLeaveUpdated} />
                </td>
                <td className="govuk-table__cell">
                  {leave.active ? (
                    <strong className="govuk-tag govuk-tag--yellow">Active</strong>
                  ) : leave.returned_on ? (
                    "Returned"
                  ) : (
                    "Past"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {session && (
        <form
          className="govuk-!-margin-bottom-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (!magistrate || !loaStartsOn) return;
            setCreatingLoa(true);
            setError(null);
            createLeaveOfAbsence(magistrate.id, {
              starts_on: loaStartsOn,
              ends_on: loaEndsOn.trim() || null,
              reason: loaReason.trim() || null,
              notes: loaNotes.trim() || null,
              next_review_on: loaReviewOn.trim() || null,
            })
              .then(() =>
                getMagistrate(magistrate.id, periodFilterQuery(periodFilter)).then((data) => {
                  setMagistrate(data);
                  setLoaStartsOn("");
                  setLoaEndsOn("");
                  setLoaReason("");
                  setLoaNotes("");
                  setLoaReviewOn("");
                })
              )
              .catch((err: unknown) =>
                setError(err instanceof ApiError ? err.message : "Could not add leave of absence")
              )
              .finally(() => setCreatingLoa(false));
          }}
        >
          <h3 className="govuk-heading-m">Add leave of absence</h3>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="loa-starts-on">
              Start date
            </label>
            <input
              className="govuk-input govuk-input--width-10"
              id="loa-starts-on"
              type="date"
              value={loaStartsOn}
              onChange={(event) => setLoaStartsOn(event.target.value)}
              required
            />
          </div>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="loa-ends-on">
              End date (optional)
            </label>
            <div className="govuk-hint">Leave blank for open-ended leave.</div>
            <input
              className="govuk-input govuk-input--width-10"
              id="loa-ends-on"
              type="date"
              value={loaEndsOn}
              onChange={(event) => setLoaEndsOn(event.target.value)}
              min={loaStartsOn || undefined}
            />
          </div>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="loa-reason">
              Reason (optional)
            </label>
            <input
              className="govuk-input govuk-!-width-two-thirds"
              id="loa-reason"
              value={loaReason}
              onChange={(event) => setLoaReason(event.target.value)}
            />
          </div>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="loa-review-on">
              Next LOA review (optional)
            </label>
            <input
              className="govuk-input govuk-input--width-10"
              id="loa-review-on"
              type="date"
              value={loaReviewOn}
              onChange={(event) => setLoaReviewOn(event.target.value)}
              min={loaStartsOn || undefined}
            />
          </div>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="loa-notes">
              Notes (optional)
            </label>
            <textarea
              className="govuk-textarea"
              id="loa-notes"
              rows={2}
              value={loaNotes}
              onChange={(event) => setLoaNotes(event.target.value)}
            />
          </div>
          <button type="submit" className="govuk-button" disabled={creatingLoa || !loaStartsOn}>
            {creatingLoa ? "Saving…" : "Add leave of absence"}
          </button>
        </form>
      )}
            </CasebookTabPanel>

            <CasebookTabPanel id="cases" activeId={activeTab}>
      {cases.length === 0 ? (
        <p className="govuk-body">No cases recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <SortableTableHeader columnKey="public_id" sort={caseSort} onSort={toggleCaseSort}>
                Case ID
              </SortableTableHeader>
              <SortableTableHeader columnKey="title" sort={caseSort} onSort={toggleCaseSort}>
                Title
              </SortableTableHeader>
              <SortableTableHeader columnKey="status" sort={caseSort} onSort={toggleCaseSort}>
                Status
              </SortableTableHeader>
              <SortableTableHeader columnKey="created_at" sort={caseSort} onSort={toggleCaseSort}>
                Created
              </SortableTableHeader>
              <SortableTableHeader columnKey="updated_at" sort={caseSort} onSort={toggleCaseSort}>
                Updated
              </SortableTableHeader>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {sortedCases.map((kase) => (
              <tr key={kase.id} className="govuk-table__row">
                <td className="govuk-table__cell">
                  <Link to={`/cases/${kase.public_id || kase.id}`} className="govuk-link">
                    {kase.public_id ?? kase.id}
                  </Link>
                </td>
                <td className="govuk-table__cell">
                  <Link to={`/cases/${kase.public_id || kase.id}`} className="govuk-link">
                    {kase.title}
                  </Link>
                </td>
                <td className="govuk-table__cell">
                  <strong className={`govuk-tag ${kase.status === "open" ? "govuk-tag--blue" : "govuk-tag--grey"}`}>
                    {kase.status}
                  </strong>
                </td>
                <td className="govuk-table__cell">{formatTaskDate(kase.created_at)}</td>
                <td className="govuk-table__cell">{formatTaskDate(kase.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(session && (showCreateCase || cases.length === 0)) && (
        <form
          className="govuk-!-margin-bottom-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (!magistrate || !newCaseTitle.trim()) return;
            setCreatingCase(true);
            createCase(magistrate.id, {
              title: newCaseTitle.trim(),
              summary: newCaseSummary.trim() || null,
              status: "open",
            })
              .then((created) => {
                setMagistrate((current) =>
                  current ? { ...current, cases: [created, ...current.cases] } : current
                );
                setNewCaseTitle("");
                setNewCaseSummary("");
              })
              .catch((err: unknown) =>
                setError(err instanceof ApiError ? err.message : "Could not create case")
              )
              .finally(() => setCreatingCase(false));
          }}
        >
          <h3 className="govuk-heading-m">Create case</h3>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="new-case-title">
              Title
            </label>
            <input
              className="govuk-input govuk-!-width-two-thirds"
              id="new-case-title"
              value={newCaseTitle}
              onChange={(event) => setNewCaseTitle(event.target.value)}
              required
            />
          </div>
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="new-case-summary">
              Summary (optional)
            </label>
            <textarea
              className="govuk-textarea"
              id="new-case-summary"
              rows={2}
              value={newCaseSummary}
              onChange={(event) => setNewCaseSummary(event.target.value)}
            />
          </div>
          <button type="submit" className="govuk-button" disabled={creatingCase || !newCaseTitle.trim()}>
            {creatingCase ? "Creating…" : "Create case"}
          </button>
        </form>
      )}

              <h3 className="govuk-heading-m">Magistrate timeline</h3>
      {(magistrate.timeline ?? []).length === 0 ? (
        <p className="govuk-body">No case timeline entries yet.</p>
      ) : (
        <ol className="govuk-list">
          {(magistrate.timeline ?? []).map((entry) => (
            <li key={entry.id} className="govuk-!-margin-bottom-4">
              <p className="govuk-body-s govuk-!-margin-bottom-1">
                {formatTaskDate(entry.created_at)} · {entry.public_id}
              </p>
              <p className="govuk-body">
                <Link to={entry.path_hint ?? `/cases/${entry.public_id || entry.id}`} className="govuk-link">
                  {entry.title}
                </Link>
                {" "}
                <strong className={`govuk-tag ${entry.status === "open" ? "govuk-tag--blue" : "govuk-tag--grey"}`}>
                  {entry.status}
                </strong>
              </p>
            </li>
          ))}
        </ol>
      )}
            </CasebookTabPanel>
          </>
        }
        sidebar={
          <MagistrateSidebar magistrate={magistrate} canViewNames={canViewNames} />
        }
      />
    </>
  );
}
