import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMagistratesOnLeave } from "../api/magistrates";
import { ApiError } from "../api/http";
import { LoaReviewDateEditor } from "../components/LoaReviewDateEditor";
import { MagistrateLink } from "../components/MagistrateLink";
import { useRole } from "../context/RoleContext";
import type { LeaveOfAbsence, MagistrateSummary } from "../types/domain";

function formatLeaveEnd(leave: LeaveOfAbsence) {
  return leave.ends_on ?? "Open-ended";
}

export function OnLeavePage() {
  const { role, canViewNames } = useRole();
  const [magistrates, setMagistrates] = useState<MagistrateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMagistratesOnLeave()
      .then(setMagistrates)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load leave list"))
      .finally(() => setLoading(false));
  }, [role]);

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
                Leave from
              </th>
              <th scope="col" className="govuk-table__header">
                Leave to
              </th>
              <th scope="col" className="govuk-table__header">
                Next LOA review
              </th>
              <th scope="col" className="govuk-table__header">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {magistrates.flatMap((magistrate) =>
              magistrate.current_leaves.map((leave) => (
                <tr key={`${magistrate.id}-${leave.id}`} className="govuk-table__row">
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
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
