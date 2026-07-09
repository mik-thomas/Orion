import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { listMagistrates } from "../api/magistrates";
import { ApiError } from "../api/http";
import { MagistrateLink } from "../components/MagistrateLink";
import { DashboardSection } from "../components/DashboardSection";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { magistrateComplianceRows } from "../components/charts/chartAggregations";
import { useRole } from "../context/RoleContext";
import type { MagistrateSummary } from "../types/domain";

export function MagistratesPage() {
  const { role, canViewNames } = useRole();
  const [magistrates, setMagistrates] = useState<MagistrateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const complianceSummaryId = useId();

  useEffect(() => {
    listMagistrates()
      .then(setMagistrates)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load magistrates"))
      .finally(() => setLoading(false));
  }, [role]);

  return (
    <>
      <h1 className="govuk-heading-xl">Magistrates</h1>
      <p className="govuk-body">
        Profiles include appointment details, sitting locations, adjustments and leave.{" "}
        <Link to="/magistrates/on-leave" className="govuk-link">
          View magistrates currently on leave
        </Link>
        .
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
      ) : (
        <>
          {magistrates.length > 0 ? (
            <DashboardSection
              title="Compliance overview"
              description="Sitting commitment and compliance status across all magistrates."
            >
              <HorizontalBarChart
                rows={magistrateComplianceRows(magistrates)}
                emptyMessage="No magistrate data."
                summaryContext="magistrates"
                summaryId={complianceSummaryId}
              />
            </DashboardSection>
          ) : null}

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
                  Appointed
                </th>
                <th scope="col" className="govuk-table__header">
                  Leave
                </th>
                <th scope="col" className="govuk-table__header">
                  Compliance
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {magistrates.map((magistrate) => (
                <tr key={magistrate.id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <MagistrateLink id={magistrate.id} name={magistrate.display_name} />
                  </td>
                  <td className="govuk-table__cell">{magistrate.home_courthouse?.name ?? "—"}</td>
                  <td className="govuk-table__cell">{magistrate.date_of_appointment ?? "—"}</td>
                  <td className="govuk-table__cell">
                    {magistrate.active_leave ? (
                      <strong className="govuk-tag govuk-tag--yellow">On leave</strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="govuk-table__cell">
                    {magistrate.sitting_commitment ? (
                      <span className="govuk-body-s govuk-!-display-block">
                        {magistrate.sitting_commitment.full_days_completed}/
                        {magistrate.sitting_commitment.full_days_required} full days
                      </span>
                    ) : null}
                    {magistrate.has_violations ? (
                      <strong className="govuk-tag govuk-tag--red">
                        {magistrate.violations.length} {magistrate.violations.length === 1 ? "issue" : "issues"}
                      </strong>
                    ) : magistrate.sitting_commitment ? (
                      <span className="govuk-body-s">On track</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
