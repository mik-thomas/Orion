import { request } from "./http";
import type { ReportsOverview } from "../types/domain";

export function getReportsOverview(query = "") {
  const suffix = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return request<ReportsOverview>(`/api/v1/reports/overview${suffix}`);
}
