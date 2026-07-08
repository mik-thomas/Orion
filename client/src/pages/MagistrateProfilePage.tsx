import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";
import type { MagistrateDetail } from "../types/domain";

export function MagistrateProfilePage() {
  const { id } = useParams();
  const [magistrate, setMagistrate] = useState<MagistrateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getMagistrate(Number(id))
      .then(setMagistrate)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

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
            {magistrate.full_name}
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">{magistrate.full_name}</h1>

      {magistrate.active_leave && (
        <div className="govuk-notification-banner govuk-notification-banner--warning" role="region">
          <div className="govuk-notification-banner__header">
            <h2 className="govuk-notification-banner__title">Leave of absence in place</h2>
          </div>
          <div className="govuk-notification-banner__content">
            <p className="govuk-notification-banner__heading">Check current leave dates before assigning sittings.</p>
          </div>
        </div>
      )}

      <dl className="govuk-summary-list">
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
      </dl>

      <h2 className="govuk-heading-l">Leave of absence</h2>
      {magistrate.leaves_of_absence.length === 0 ? (
        <p className="govuk-body">No leave recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                From
              </th>
              <th scope="col" className="govuk-table__header">
                To
              </th>
              <th scope="col" className="govuk-table__header">
                Reason
              </th>
              <th scope="col" className="govuk-table__header">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {magistrate.leaves_of_absence.map((leave) => (
              <tr key={leave.id} className="govuk-table__row">
                <td className="govuk-table__cell">{leave.starts_on}</td>
                <td className="govuk-table__cell">{leave.ends_on ?? "Open-ended"}</td>
                <td className="govuk-table__cell">{leave.reason ?? "—"}</td>
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
      {magistrate.cases.length === 0 ? (
        <p className="govuk-body">No cases recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Reference
              </th>
              <th scope="col" className="govuk-table__header">
                Title
              </th>
              <th scope="col" className="govuk-table__header">
                Status
              </th>
              <th scope="col" className="govuk-table__header">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {magistrate.cases.map((kase) => (
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
