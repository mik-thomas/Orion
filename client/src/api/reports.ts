import { request } from "./http";
import type { ReportsOverview } from "../types/domain";

export function getReportsOverview() {
  return request<ReportsOverview>("/api/v1/reports/overview");
}
