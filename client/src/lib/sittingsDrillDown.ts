import { periodFilterQuery, defaultPeriodFilter, type PeriodFilterState } from "./periodFilter";
import {
  cancellationCategoryHeading,
  isCancellationCategory,
} from "./cancellationCategory";
import type { SittingsDrillDownFilters } from "../types/domain";

export type { SittingsDrillDownFilters } from "../types/domain";
export type SittingStatus = NonNullable<SittingsDrillDownFilters["status"]>;

export function sittingsDrillDownQuery(
  filters: SittingsDrillDownFilters,
  period?: PeriodFilterState
): string {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.cancellation_category) params.set("cancellation_category", filters.cancellation_category);
  if (filters.courthouse) params.set("courthouse", filters.courthouse);
  if (filters.courthouse_id != null) params.set("courthouse_id", String(filters.courthouse_id));
  if (filters.court_type) params.set("court_type", filters.court_type);
  if (filters.court_room) params.set("court_room", filters.court_room);
  if (filters.sitting_type) params.set("sitting_type", filters.sitting_type);
  if (filters.sitting_type_id != null) params.set("sitting_type_id", String(filters.sitting_type_id));
  if (filters.magistrate_id != null) params.set("magistrate_id", String(filters.magistrate_id));
  if (filters.away_from_home) params.set("away_from_home", "1");
  if (filters.page != null && filters.page > 1) params.set("page", String(filters.page));
  if (filters.per_page != null) params.set("per_page", String(filters.per_page));

  if (period) {
    const periodQuery = periodFilterQuery(period);
    if (periodQuery) {
      new URLSearchParams(periodQuery).forEach((value, key) => params.set(key, value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function sittingsDrillDownPath(
  filters: SittingsDrillDownFilters,
  period?: PeriodFilterState
): string {
  return `/reports/sittings${sittingsDrillDownQuery(filters, period)}`;
}

export function parseSittingsDrillDownSearch(search: string): SittingsDrillDownFilters & PeriodFilterState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const period: PeriodFilterState =
    params.get("period") === "all"
      ? { mode: "all", fiscalYear: null, quarter: null }
      : params.has("period") || params.has("fiscal_year") || params.has("quarter")
        ? {
            mode: "fiscal_year",
            fiscalYear: params.get("fiscal_year"),
            quarter: params.get("quarter"),
          }
        : defaultPeriodFilter();

  const status = params.get("status");
  const page = params.get("page");
  const perPage = params.get("per_page");
  const cancellationCategory = params.get("cancellation_category");

  return {
    ...period,
    status: status === "completed" || status === "vacated" || status === "cancelled" ? status : undefined,
    cancellation_category: isCancellationCategory(cancellationCategory) ? cancellationCategory : undefined,
    courthouse: params.get("courthouse") ?? undefined,
    courthouse_id: params.get("courthouse_id") ? Number(params.get("courthouse_id")) : undefined,
    court_type: params.get("court_type") ?? undefined,
    court_room: params.get("court_room") ?? undefined,
    sitting_type: params.get("sitting_type") ?? undefined,
    sitting_type_id: params.get("sitting_type_id") ? Number(params.get("sitting_type_id")) : undefined,
    magistrate_id: params.get("magistrate_id") ? Number(params.get("magistrate_id")) : undefined,
    away_from_home: params.get("away_from_home") === "1",
    page: page ? Number(page) : undefined,
    per_page: perPage ? Number(perPage) : undefined,
  };
}

export function sittingsDrillDownHeading(filters: SittingsDrillDownFilters): string {
  const parts: string[] = [];

  if (filters.status === "completed") parts.push("Completed sittings");
  else if (filters.status === "vacated" && filters.cancellation_category) {
    parts.push(cancellationCategoryHeading("vacated", filters.cancellation_category));
  } else if (filters.status === "vacated") parts.push("Vacated sittings");
  else if (filters.status === "cancelled" && filters.cancellation_category) {
    parts.push(cancellationCategoryHeading("cancelled", filters.cancellation_category));
  } else if (filters.status === "cancelled") parts.push("Cancelled sittings");
  else parts.push("Sittings");

  if (filters.sitting_type) parts.push(`business type ${filters.sitting_type}`);
  if (filters.courthouse) parts.push(`at ${filters.courthouse}`);
  if (filters.court_type) parts.push(`court type ${filters.court_type}`);
  if (filters.court_room) {
    parts.push(
      filters.courthouse
        ? `court room ${filters.court_room}`
        : `court room ${filters.court_room}${filters.courthouse ? ` (${filters.courthouse})` : ""}`
    );
  }
  if (filters.away_from_home) parts.push("away from home court");

  return parts.join(" — ");
}
