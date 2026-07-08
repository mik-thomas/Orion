import type { DjCancellations } from "../types/domain";

interface DjCancellationSectionProps {
  report: DjCancellations;
  heading?: string;
}

export function DjCancellationSection({
  report,
  heading = "District Judge cancellations",
}: DjCancellationSectionProps) {
  return (
    <section className="govuk-!-margin-top-6">
      <h2 className="govuk-heading-l">{heading}</h2>
      <p className="govuk-body">
        Sittings cancelled because a District Judge took the bench —{" "}
        <strong className="govuk-tag govuk-tag--red">{report.total} total</strong>
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
                    <td className="govuk-table__cell">{row.courthouse}</td>
                    <td className="govuk-table__cell">{row.sittings}</td>
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
                    <td className="govuk-table__cell">{row.sitting_type}</td>
                    <td className="govuk-table__cell">{row.sittings}</td>
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
                      {row.courthouse} — {row.court_room}
                    </td>
                    <td className="govuk-table__cell">{row.sittings}</td>
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
