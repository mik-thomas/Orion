import { useCallback, useMemo, useState } from "react";
import {
  nextSortState,
  sortRows,
  type ColumnSortConfig,
  type SortDirection,
  type TableSortState,
} from "./tableSort";

type DefaultSort = {
  key: string;
  direction: SortDirection;
};

export function useTableSort<T>(
  data: readonly T[],
  columns: Record<string, ColumnSortConfig<T>>,
  defaultSort?: DefaultSort | null
) {
  const [sort, setSort] = useState<TableSortState>(defaultSort ?? null);

  const toggleSort = useCallback((key: string) => {
    setSort((current) => nextSortState(current, key));
  }, []);

  const sortedData = useMemo(() => sortRows(data, columns, sort), [columns, data, sort]);

  return { sort, toggleSort, sortedData };
}
