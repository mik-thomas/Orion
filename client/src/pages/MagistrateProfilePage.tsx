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
import { homeAwaySegments, SimpleDonut } from "../components/charts/SimpleDonut";
import { courtRoomStackRow, StackedBarChart } from "../components/charts/StackedBarChart";
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
import type { LeaveOfAbsence, MagistrateDetail } from "../types/domain";

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
                <DonutOrBarChart
                  totals={summary.totals}
                  summaryContext={periodLabel}
                  summaryId={statusSummaryId}
                />
              </DashboardSection>

              {summary.home_away ? (
                <DashboardSection
                  title="Home / away"
                  headingLevel={3}
                  description={`Completed sittings at home court vs away for ${periodLabel}.`}
                >
                  <SimpleDonut
                    segments={homeAwaySegments(summary.home_away.at_home, summary.home_away.away)}
                    centreLabel={`${summary.home_away.away_pct}% away`}
                    summaryContext={periodLabel}
                    summaryId={homeAwaySummaryId}
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
                    <>
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
                        {summary.by_location.map((row) => (
                          <tr key={row.courthouse} className="govuk-table__row">
                            <td className="govuk-table__cell">{row.courthouse}</td>
                            <td className="govuk-table__cell">{row.sittings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
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
                    <>
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
                        {summary.by_court_type.map((row) => (
                          <tr key={row.court_type} className="govuk-table__row">
                            <td className="govuk-table__cell">{row.court_type}</td>
                            <td className="govuk-table__cell">{row.sittings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
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
                    <>
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
                        {summary.by_sitting_type.map((row) => (
                          <tr key={row.sitting_type} className="govuk-table__row">
                            <td className="govuk-table__cell">{row.sitting_type}</td>
                            <td className="govuk-table__cell">{row.sittings}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
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
                table={
                  <>
                    <thead className="govuk-table__head">
                      <tr className="govuk-table__row">
                        <th scope="col" className="govuk-table__header">
                          Courthouse
                        </th>
                        <th scope="col" className="govuk-table__header">
                          Court room
                        </th>
                        <th scope="col" className="govuk-table__header">
                          Total
                        </th>
                        <th scope="col" className="govuk-table__header">
                          Completed
                        </th>
                        <th scope="col" className="govuk-table__header">
                          Vacated
                        </th>
                        <th scope="col" className="govuk-table__header">
                          Cancelled
                        </th>
                        <th scope="col" className="govuk-table__header">
                          Cancelled by DJ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="govuk-table__body">
                      {summary.by_court_room.map((row) => (
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
                }
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
                Role
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
                Next LOA review
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
