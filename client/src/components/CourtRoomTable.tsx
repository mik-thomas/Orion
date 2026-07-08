import type { CourtRoomRow } from "../types/domain";

interface CourtRoomTableProps {
  rows: CourtRoomRow[];
  heading?: string;
  emptyMessage?: string;
}

export function CourtRoomTable({
  rows,
  heading = "Sittings by court room",
  emptyMessage = "No court room data recorded.",
}: CourtRoomTableProps) {
  return (
    <section className="govuk-!-margin-top-6">
      <h3 className="govuk-heading-m">{heading}</h3>
      {rows.length === 0 ? (
        <p className="govuk-body">{emptyMessage}</p>
      ) : (
        <table className="govuk-table">
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
            {rows.map((row) => (
              <tr key={`${row.courthouse}-${row.court_room}`} className="govuk-table__row">
                <td className="govuk-table__cell">{row.courthouse}</td>
                <td className="govuk-table__cell">{row.court_room}</td>
                <td className="govuk-table__cell">{row.sittings}</td>
                <td className="govuk-table__cell">{row.completed}</td>
                <td className="govuk-table__cell">{row.vacated}</td>
                <td className="govuk-table__cell">{row.cancelled}</td>
                <td className="govuk-table__cell">
                  {row.cancelled_by_dj > 0 ? (
                    <strong className="govuk-tag govuk-tag--red">{row.cancelled_by_dj}</strong>
                  ) : (
                    row.cancelled_by_dj
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
