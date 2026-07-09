import { sittingStatusSegments } from "./DonutOrBarChart";

type SittingStatusTotals = {
  completed: number;
  vacated: number;
  cancelled: number;
  cancelled_by_dj: number;
};

type SittingStatusTableProps = {
  caption: string;
  totals: SittingStatusTotals;
  emptyMessage?: string;
};

export function SittingStatusTable({
  caption,
  totals,
  emptyMessage = "No sittings recorded for this period.",
}: SittingStatusTableProps) {
  const rows = sittingStatusSegments(totals).filter((segment) => segment.value > 0);

  if (rows.length === 0) {
    return <p className="govuk-body">{emptyMessage}</p>;
  }

  return (
    <table className="govuk-table">
      <caption className="govuk-table__caption govuk-table__caption--m">{caption}</caption>
      <thead className="govuk-table__head">
        <tr className="govuk-table__row">
          <th scope="col" className="govuk-table__header">
            Status
          </th>
          <th scope="col" className="govuk-table__header">
            Sittings
          </th>
        </tr>
      </thead>
      <tbody className="govuk-table__body">
        {rows.map((row) => (
          <tr key={row.key} className="govuk-table__row">
            <td className="govuk-table__cell">{row.label}</td>
            <td className="govuk-table__cell">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
