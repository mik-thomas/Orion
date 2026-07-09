import { useMemo, type ReactNode } from "react";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../lib/useTableSort";

type SortableTwoColumnTableProps<T> = {
  rows: readonly T[];
  rowKey: (row: T) => string;
  labelHeader: string;
  valueHeader?: string;
  getLabel: (row: T) => ReactNode;
  getLabelSortValue: (row: T) => string;
  getValue: (row: T) => number;
  defaultSort?: { key: "label" | "value"; direction: "asc" | "desc" };
};

export function SortableTwoColumnTable<T>({
  rows,
  rowKey,
  labelHeader,
  valueHeader = "Sittings",
  getLabel,
  getLabelSortValue,
  getValue,
  defaultSort = { key: "value", direction: "desc" },
}: SortableTwoColumnTableProps<T>) {
  const sortColumns = useMemo(
    () => ({
      label: { getValue: getLabelSortValue },
      value: { getValue, type: "number" as const },
    }),
    [getLabelSortValue, getValue]
  );
  const { sort, toggleSort, sortedData } = useTableSort(rows, sortColumns, defaultSort);

  return (
    <>
      <thead className="govuk-table__head">
        <tr className="govuk-table__row">
          <SortableTableHeader columnKey="label" sort={sort} onSort={toggleSort}>
            {labelHeader}
          </SortableTableHeader>
          <SortableTableHeader columnKey="value" sort={sort} onSort={toggleSort}>
            {valueHeader}
          </SortableTableHeader>
        </tr>
      </thead>
      <tbody className="govuk-table__body">
        {sortedData.map((row) => (
          <tr key={rowKey(row)} className="govuk-table__row">
            <td className="govuk-table__cell">{getLabel(row)}</td>
            <td className="govuk-table__cell">{getValue(row)}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
}
