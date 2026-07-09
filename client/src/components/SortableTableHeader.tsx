import type { ReactNode } from "react";
import type { TableSortState } from "../lib/tableSort";

type SortableTableHeaderProps = {
  columnKey: string;
  sort: TableSortState;
  onSort: (key: string) => void;
  children: ReactNode;
  numeric?: boolean;
  className?: string;
};

export function SortableTableHeader({
  columnKey,
  sort,
  onSort,
  children,
  numeric = false,
  className,
}: SortableTableHeaderProps) {
  const isActive = sort?.key === columnKey;
  const ariaSort = isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const indicator = isActive ? (sort.direction === "asc" ? "↑" : "↓") : "↕";

  const headerClass = [
    "govuk-table__header",
    numeric ? "govuk-table__header--numeric" : "",
    "orion-sortable-table__header",
    isActive ? "orion-sortable-table__header--sorted" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <th scope="col" className={headerClass} aria-sort={ariaSort}>
      <button type="button" className="orion-sortable-table__button" onClick={() => onSort(columnKey)}>
        <span className="orion-sortable-table__label">{children}</span>
        <span className="orion-sortable-table__indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  );
}
