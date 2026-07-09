import type { DjCancellations } from "../types/domain";
import type { PeriodFilterState } from "../lib/periodFilter";
import { DrillDownLink } from "./DrillDownLink";

interface DjCancellationSectionProps {
  report: DjCancellations;
  heading?: string;
  periodFilter?: PeriodFilterState;
}

const djFilters = {
  status: "cancelled" as const,
  cancellation_category: "district_judge" as const,
};

export function DjCancellationSection({
  report,
  heading = "District Judge cancellations",
  periodFilter,
}: DjCancellationSectionProps) {
  return (
    <section className="govuk-!-margin-top-6">
      <h2 className="govuk-heading-l">{heading}</h2>
      <p className="govuk-body">
        Sittings cancelled because a District Judge took the bench —{" "}
        {periodFilter ? (
          <DrillDownLink
            filters={djFilters}
            period={periodFilter}
            ariaLabel={`View all ${report.total} sittings cancelled by District Judge`}
          >
            <strong className="govuk-tag govuk-tag--red">{report.total} total</strong>
          </DrillDownLink>
        ) : (
          <strong className="govuk-tag govuk-tag--red">{report.total} total</strong>
        )}
      </p>

      <div className="govuk-grid-row govuk-!-margin-top-4">
        <div className="govuk-grid-column-one-third">
          <h3 className="govuk-heading-m">By location</h3>
          {report.by_courthouse.length === 0 ? (
            <p className="govuk-body">None recorded.</p>
          ) : (
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">
                    Courthouse
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Cancelled
                  </th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {report.by_courthouse.map((row) => (
                  <tr key={row.courthouse} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      {periodFilter ? (
                        <DrillDownLink
                          filters={{ ...djFilters, courthouse: row.courthouse }}
                          period={periodFilter}
                          ariaLabel={`View DJ cancellations at ${row.courthouse}`}
                        >
                          {row.courthouse}
                        </DrillDownLink>
                      ) : (
                        row.courthouse
                      )}
                    </td>
                    <td className="govuk-table__cell">
                      {periodFilter && row.sittings > 0 ? (
                        <DrillDownLink
                          filters={{ ...djFilters, courthouse: row.courthouse }}
                          period={periodFilter}
                          ariaLabel={`View ${row.sittings} DJ cancellations at ${row.courthouse}`}
                        >
                          {row.sittings}
                        </DrillDownLink>
                      ) : (
                        row.sittings
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="govuk-grid-column-one-third">
          <h3 className="govuk-heading-m">By sitting bench</h3>
          {report.by_sitting_type.length === 0 ? (
            <p className="govuk-body">None recorded.</p>
          ) : (
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">
                    Type
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Cancelled
                  </th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {report.by_sitting_type.map((row) => (
                  <tr key={row.sitting_type} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      {periodFilter ? (
                        <DrillDownLink
                          filters={{ ...djFilters, sitting_type: row.sitting_type }}
                          period={periodFilter}
                          ariaLabel={`View DJ cancellations for ${row.sitting_type}`}
                        >
                          {row.sitting_type}
                        </DrillDownLink>
                      ) : (
                        row.sitting_type
                      )}
                    </td>
                    <td className="govuk-table__cell">
                      {periodFilter && row.sittings > 0 ? (
                        <DrillDownLink
                          filters={{ ...djFilters, sitting_type: row.sitting_type }}
                          period={periodFilter}
                          ariaLabel={`View ${row.sittings} DJ cancellations for ${row.sitting_type}`}
                        >
                          {row.sittings}
                        </DrillDownLink>
                      ) : (
                        row.sittings
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="govuk-grid-column-one-third">
          <h3 className="govuk-heading-m">By court room</h3>
          {report.by_court_room.length === 0 ? (
            <p className="govuk-body">None recorded.</p>
          ) : (
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">
                    Location
                  </th>
                  <th scope="col" className="govuk-table__header">
                    Cancelled
                  </th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {report.by_court_room.map((row) => (
                  <tr key={`${row.courthouse}-${row.court_room}`} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      {periodFilter ? (
                        <DrillDownLink
                          filters={{
                            ...djFilters,
                            courthouse: row.courthouse,
                            court_room: row.court_room,
                          }}
                          period={periodFilter}
                          ariaLabel={`View DJ cancellations in ${row.court_room} at ${row.courthouse}`}
                        >
                          {row.courthouse} — {row.court_room}
                        </DrillDownLink>
                      ) : (
                        <>
                          {row.courthouse} — {row.court_room}
                        </>
                      )}
                    </td>
                    <td className="govuk-table__cell">
                      {periodFilter && row.sittings > 0 ? (
                        <DrillDownLink
                          filters={{
                            ...djFilters,
                            courthouse: row.courthouse,
                            court_room: row.court_room,
                          }}
                          period={periodFilter}
                          ariaLabel={`View ${row.sittings} DJ cancellations in ${row.court_room} at ${row.courthouse}`}
                        >
                          {row.sittings}
                        </DrillDownLink>
                      ) : (
                        row.sittings
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
