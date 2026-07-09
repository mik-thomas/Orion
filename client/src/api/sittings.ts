import { request } from "./http";
import type { SittingsDrillDownResponse } from "../types/domain";
import { sittingsDrillDownQuery, type SittingsDrillDownFilters } from "../lib/sittingsDrillDown";
import type { PeriodFilterState } from "../lib/periodFilter";

export function listSittingsDrillDown(
  filters: SittingsDrillDownFilters,
  period?: PeriodFilterState
) {
  const query = sittingsDrillDownQuery(filters, period).replace(/^\?/, "");
  const suffix = query ? `?${query}` : "";
  return request<SittingsDrillDownResponse>(`/api/v1/sittings/drill_down${suffix}`);
}

export function listSittingsDrillDownFromSearch(search: string) {
  const suffix = search.startsWith("?") ? search : search ? `?${search}` : "";
  return request<SittingsDrillDownResponse>(`/api/v1/sittings/drill_down${suffix}`);
}
