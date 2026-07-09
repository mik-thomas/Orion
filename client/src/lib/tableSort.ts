export type SortDirection = "asc" | "desc";

export type TableSortState = {
  key: string;
  direction: SortDirection;
} | null;

export type SortValueType = "string" | "number" | "date";

export type ColumnSortConfig<T> = {
  type?: SortValueType;
  getValue: (row: T) => unknown;
};

export function compareSortValues(
  a: unknown,
  b: unknown,
  type: SortValueType = "string"
): number {
  const aEmpty = isEmptySortValue(a);
  const bEmpty = isEmptySortValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (type === "number") {
    const na = typeof a === "number" ? a : Number(a);
    const nb = typeof b === "number" ? b : Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }

  if (type === "date") {
    const da = Date.parse(String(a));
    const db = Date.parse(String(b));
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return da - db;
  }

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

function isEmptySortValue(value: unknown): boolean {
  return value == null || value === "" || value === "—";
}

export function sortRows<T>(
  data: readonly T[],
  columns: Record<string, ColumnSortConfig<T>>,
  sort: TableSortState
): T[] {
  if (!sort) return [...data];

  const column = columns[sort.key];
  if (!column) return [...data];

  const type = column.type ?? "string";
  return [...data].sort((left, right) => {
    const cmp = compareSortValues(column.getValue(left), column.getValue(right), type);
    return sort.direction === "asc" ? cmp : -cmp;
  });
}

export function nextSortState(current: TableSortState, key: string): TableSortState {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}
