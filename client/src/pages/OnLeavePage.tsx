import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listMagistratesOnLeave } from "../api/magistrates";
import { ApiError } from "../api/http";
import { LoaReviewDateEditor } from "../components/LoaReviewDateEditor";
import { MagistrateLink } from "../components/MagistrateLink";
import { DashboardSection } from "../components/DashboardSection";
import { SortableTableHeader } from "../components/SortableTableHeader";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import {
  loaReasonRows,
  loaReviewStatusRows,
  loaTimelineRows,
} from "../components/charts/chartAggregations";
import { useRole } from "../context/RoleContext";
import { useTableSort } from "../lib/useTableSort";
import type { LeaveOfAbsence, MagistrateSummary } from "../types/domain";

function formatLeaveEnd(leave: LeaveOfAbsence) {
  return leave.ends_on ?? "Open-ended";
}

type OnLeaveTableRow = {
  key: string;
  magistrate: MagistrateSummary;
  leave: LeaveOfAbsence;
  display_name: string;
  home_court: string;
  starts_on: string;
  ends_on: string;
  review_on: string;
  reason: string;
};

export function OnLeavePage() {
  const { role, canViewNames } = useRole();
  const [magistrates, setMagistrates] = useState<MagistrateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reasonSummaryId = useId();
  const reviewSummaryId = useId();
  const timelineSummaryId = useId();

  useEffect(() => {
    listMagistratesOnLeave()
      .then(setMagistrates)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load leave list"))
      .finally(() => setLoading(false));
  }, [role]);

  const allLeaves = useMemo(
    () => magistrates.flatMap((magistrate) => magistrate.current_leaves),
    [magistrates]
  );

  const leaveRows = useMemo<OnLeaveTableRow[]>(
    () =>
      magistrates.flatMap((magistrate) =>
        magistrate.current_leaves.map((leave) => ({
          key: `${magistrate.id}-${leave.id}`,
          magistrate,
          leave,
          display_name: magistrate.display_name,
          home_court: magistrate.home_courthouse?.name ?? "",
          starts_on: leave.starts_on,
          ends_on: formatLeaveEnd(leave),
          review_on: leave.next_loa_review_on ?? "",
          reason: leave.reason ?? "",
        }))
      ),
    [magistrates]
  );
  const sortColumns = useMemo(
    () => ({
      display_name: { getValue: (row: OnLeaveTableRow) => row.display_name },
      home_court: { getValue: (row: OnLeaveTableRow) => row.home_court },
      starts_on: { getValue: (row: OnLeaveTableRow) => row.starts_on, type: "date" as const },
      ends_on: { getValue: (row: OnLeaveTableRow) => row.ends_on },
      review_on: { getValue: (row: OnLeaveTableRow) => row.review_on, type: "date" as const },
      reason: { getValue: (row: OnLeaveTableRow) => row.reason },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(leaveRows, sortColumns, {
    key: "starts_on",
    direction: "desc",
  });

  function handleLeaveUpdated(magistrateId: number, updated: LeaveOfAbsence) {
    setMagistrates((current) =>
      current.map((magistrate) =>
        magistrate.id === magistrateId
          ? {
              ...magistrate,
              current_leaves: magistrate.current_leaves.map((leave) =>
                leave.id === updated.id ? updated : leave
              ),
            }
          : magistrate
      )
    );
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
            On leave
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">On leave</h1>
      <p className="govuk-body-l">
        Magistrates with a current leave of absence (LOA), including expected return dates.
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
      ) : magistrates.length === 0 ? (
        <p className="govuk-body">No magistrates are currently on leave.</p>
      ) : (
        <>
          <div className="orion-profile-charts-grid orion-profile-charts-grid--three govuk-!-margin-bottom-6">
            <DashboardSection title="Leave reasons" headingLevel={2}>
              <HorizontalBarChart
                rows={loaReasonRows(allLeaves)}
                emptyMessage="No leave reasons recorded."
                summaryContext="leave reasons"
                summaryId={reasonSummaryId}
              />
            </DashboardSection>
            <DashboardSection title="LOA review status" headingLevel={2}>
              <HorizontalBarChart
                rows={loaReviewStatusRows(allLeaves)}
                emptyMessage="No review dates to show."
                summaryContext="LOA review status"
                summaryId={reviewSummaryId}
              />
            </DashboardSection>
            <DashboardSection title="Leave start timeline" headingLevel={2}>
              <HorizontalBarChart
                rows={loaTimelineRows(allLeaves)}
                emptyMessage="No leave start dates recorded."
                summaryContext="leave starts by month"
                summaryId={timelineSummaryId}
              />
            </DashboardSection>
          </div>

          <table className="govuk-table">
            <caption className="govuk-table__caption govuk-table__caption--m">Magistrates on leave</caption>
            <thead className="govuk-table__head">
                  <tr className="govuk-table__row">
                    <SortableTableHeader columnKey="display_name" sort={sort} onSort={toggleSort}>
                      {canViewNames ? "Name" : "Reference"}
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="home_court" sort={sort} onSort={toggleSort}>
                      Home court
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="starts_on" sort={sort} onSort={toggleSort}>
                      Leave from
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="ends_on" sort={sort} onSort={toggleSort}>
                      Leave to
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="review_on" sort={sort} onSort={toggleSort}>
                      Next LOA review
                    </SortableTableHeader>
                    <SortableTableHeader columnKey="reason" sort={sort} onSort={toggleSort}>
                      Reason
                    </SortableTableHeader>
                  </tr>
                </thead>
                <tbody className="govuk-table__body">
                  {sortedData.map(({ key, magistrate, leave }) => (
                      <tr key={key} className="govuk-table__row">
                        <td className="govuk-table__cell">
                          <MagistrateLink id={magistrate.id} name={magistrate.display_name} />
                        </td>
                        <td className="govuk-table__cell">{magistrate.home_courthouse?.name ?? "—"}</td>
                        <td className="govuk-table__cell">{leave.starts_on}</td>
                        <td className="govuk-table__cell">
                          <strong className="govuk-tag govuk-tag--yellow">{formatLeaveEnd(leave)}</strong>
                        </td>
                        <td className="govuk-table__cell">
                          <LoaReviewDateEditor
                            leave={leave}
                            onUpdated={(updated) => handleLeaveUpdated(magistrate.id, updated)}
                          />
                        </td>
                        <td className="govuk-table__cell">{leave.reason ?? "—"}</td>
                      </tr>
                  ))}
                </tbody>
          </table>
        </>
      )}
    </>
  );
}
