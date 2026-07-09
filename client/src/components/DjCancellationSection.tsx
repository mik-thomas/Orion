import type { DjCancellations } from "../types/domain";
import type { PeriodFilterState } from "../lib/periodFilter";
import { DashboardSection } from "./DashboardSection";
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
    <DashboardSection
      title={heading}
      tag={`${report.total} total`}
      tagColour="red"
      description="Sittings cancelled because a District Judge took the bench."
    >
      <p className="govuk-body govuk-!-margin-bottom-4">
        {periodFilter ? (
          <DrillDownLink
            filters={djFilters}
            period={periodFilter}
            ariaLabel={`View all ${report.total} sittings cancelled by District Judge`}
          >
            View all <strong className="govuk-tag govuk-tag--red">{report.total}</strong> cancellations
          </DrillDownLink>
        ) : (
          <>
            Total: <strong className="govuk-tag govuk-tag--red">{report.total}</strong>
          </>
        )}
      </p>

      <div className="govuk-grid-row">
        <div className="govuk-grid-column-one-third">
          <div className="orion-dashboard-subsection">
            <h3 className="govuk-heading-s orion-dashboard-subsection__title">By location</h3>
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
                            <strong className="govuk-tag govuk-tag--red">{row.sittings}</strong>
                          </DrillDownLink>
                        ) : row.sittings > 0 ? (
                          <strong className="govuk-tag govuk-tag--red">{row.sittings}</strong>
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
        <div className="govuk-grid-column-one-third">
          <div className="orion-dashboard-subsection">
            <h3 className="govuk-heading-s orion-dashboard-subsection__title">By sitting bench</h3>
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
                            <strong className="govuk-tag govuk-tag--red">{row.sittings}</strong>
                          </DrillDownLink>
                        ) : row.sittings > 0 ? (
                          <strong className="govuk-tag govuk-tag--red">{row.sittings}</strong>
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
        <div className="govuk-grid-column-one-third">
          <div className="orion-dashboard-subsection">
            <h3 className="govuk-heading-s orion-dashboard-subsection__title">By court room</h3>
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
                            <strong className="govuk-tag govuk-tag--red">{row.sittings}</strong>
                          </DrillDownLink>
                        ) : row.sittings > 0 ? (
                          <strong className="govuk-tag govuk-tag--red">{row.sittings}</strong>
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
      </div>
    </DashboardSection>
  );
}
