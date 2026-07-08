import { useEffect, useState } from "react";
import { listMagistrates } from "../api/magistrates";
import { ApiError } from "../api/http";
import { MagistrateLink } from "../components/MagistrateLink";
import type { MagistrateSummary } from "../types/domain";

export function MagistratesPage() {
  const [magistrates, setMagistrates] = useState<MagistrateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMagistrates()
      .then(setMagistrates)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load magistrates"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="govuk-heading-xl">Magistrates</h1>
      <p className="govuk-body">Profiles include appointment details, sitting locations, adjustments and leave.</p>

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
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Name
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
                  <MagistrateLink id={magistrate.id} name={magistrate.full_name} />
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
                  {magistrate.has_violations ? (
                    <strong className="govuk-tag govuk-tag--red">
                      {magistrate.violations.length} {magistrate.violations.length === 1 ? "issue" : "issues"}
                    </strong>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
