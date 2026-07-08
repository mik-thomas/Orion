import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";
import { ComplianceViolations } from "../components/ComplianceViolations";
import { CourtRoomTable } from "../components/CourtRoomTable";
import { DjCancellationSection } from "../components/DjCancellationSection";
import type { MagistrateDetail, Sitting } from "../types/domain";

function sittingStatusLabel(sitting: Sitting) {
  if (sitting.status === "cancelled" && sitting.cancellation_category === "district_judge") {
    return "Cancelled by DJ";
  }

  switch (sitting.status) {
    case "completed":
      return "Completed";
    case "vacated":
      return "Vacated";
    case "cancelled":
      return "Cancelled";
    default:
      return sitting.status;
  }
}

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

      <ComplianceViolations violations={magistrate.violations} />

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
                </li>
              ))}
            </ul>
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
      <div className="govuk-grid-row govuk-!-margin-bottom-6">
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Completed</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{magistrate.sitting_summary.totals.completed}</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Vacated</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{magistrate.sitting_summary.totals.vacated}</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Cancelled</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{magistrate.sitting_summary.totals.cancelled}</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Cancelled by DJ</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{magistrate.sitting_summary.totals.cancelled_by_dj}</p>
        </div>
      </div>

      <div className="govuk-grid-row govuk-!-margin-bottom-6">
        <div className="govuk-grid-column-one-third">
          <h3 className="govuk-heading-m">By location</h3>
          {magistrate.sitting_summary.by_location.length === 0 ? (
            <p className="govuk-body">No sittings recorded.</p>
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
                {magistrate.sitting_summary.by_location.map((row) => (
                  <tr key={row.courthouse} className="govuk-table__row">
                    <td className="govuk-table__cell">{row.courthouse}</td>
                    <td className="govuk-table__cell">{row.sittings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="govuk-grid-column-one-third">
          <h3 className="govuk-heading-m">By court type</h3>
          {magistrate.sitting_summary.by_court_type.length === 0 ? (
            <p className="govuk-body">No court types recorded.</p>
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
                {magistrate.sitting_summary.by_court_type.map((row) => (
                  <tr key={row.court_type} className="govuk-table__row">
                    <td className="govuk-table__cell">{row.court_type}</td>
                    <td className="govuk-table__cell">{row.sittings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="govuk-grid-column-one-third">
          <h3 className="govuk-heading-m">By sitting type</h3>
          {magistrate.sitting_summary.by_sitting_type.length === 0 ? (
            <p className="govuk-body">No sitting types recorded.</p>
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
                {magistrate.sitting_summary.by_sitting_type.map((row) => (
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

      {magistrate.sitting_summary.dj_cancellations.total > 0 && (
        <DjCancellationSection
          report={magistrate.sitting_summary.dj_cancellations}
          heading="District Judge cancellations"
        />
      )}

      <CourtRoomTable
        rows={magistrate.sitting_summary.by_court_room}
        heading="Sittings by court room"
        emptyMessage="No court room data for this magistrate."
      />

      {magistrate.sittings.length === 0 ? (
        <p className="govuk-body">No individual sittings recorded.</p>
      ) : (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Date
              </th>
              <th scope="col" className="govuk-table__header">
                Session
              </th>
              <th scope="col" className="govuk-table__header">
                Location
              </th>
              <th scope="col" className="govuk-table__header">
                Court room
              </th>
              <th scope="col" className="govuk-table__header">
                Type
              </th>
              <th scope="col" className="govuk-table__header">
                Court type
              </th>
              <th scope="col" className="govuk-table__header">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {magistrate.sittings.map((sitting) => (
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
                  {sitting.status === "cancelled" && sitting.cancellation_category === "district_judge" ? (
                    <strong className="govuk-tag govuk-tag--red">Cancelled by DJ</strong>
                  ) : sitting.status === "vacated" ? (
                    <strong className="govuk-tag govuk-tag--yellow">Vacated</strong>
                  ) : sitting.status === "cancelled" ? (
                    <strong className="govuk-tag govuk-tag--red">Cancelled</strong>
                  ) : (
                    sittingStatusLabel(sitting)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
