type BreakdownRow = {
  label: string;
  value: number;
};

type SimpleBreakdownTableProps = {
  caption: string;
  rows: BreakdownRow[];
  labelHeader?: string;
  valueHeader?: string;
  emptyMessage?: string;
};

export function SimpleBreakdownTable({
  caption,
  rows,
  labelHeader = "Category",
  valueHeader = "Count",
  emptyMessage = "No data yet.",
}: SimpleBreakdownTableProps) {
  if (rows.length === 0) {
    return <p className="govuk-body">{emptyMessage}</p>;
  }

  return (
    <table className="govuk-table">
      <caption className="govuk-table__caption govuk-table__caption--m">{caption}</caption>
      <thead className="govuk-table__head">
        <tr className="govuk-table__row">
          <th scope="col" className="govuk-table__header">
            {labelHeader}
          </th>
          <th scope="col" className="govuk-table__header">
            {valueHeader}
          </th>
        </tr>
      </thead>
      <tbody className="govuk-table__body">
        {rows.map((row) => (
          <tr key={row.label} className="govuk-table__row">
            <td className="govuk-table__cell">{row.label}</td>
            <td className="govuk-table__cell">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
