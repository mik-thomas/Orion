import { request } from "./http";
import type { Courthouse, MagistrateDetail, MagistrateRosterEntry, MagistrateSummary, RetiringSoonRow } from "../types/domain";

export function listMagistrates(q?: string) {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<MagistrateSummary[]>(`/api/v1/magistrates${params}`);
}

export function listMagistratesOnLeave() {
  return request<MagistrateSummary[]>("/api/v1/magistrates/on_leave");
}

export function listMagistratesRetiringSoon() {
  return request<RetiringSoonRow[]>("/api/v1/magistrates/retiring_soon");
}

export function getMagistrate(id: number, query = "") {
  const suffix = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return request<MagistrateDetail>(`/api/v1/magistrates/${id}${suffix}`);
}

export type MagistrateUpdateAttrs = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  contact_number?: string | null;
  date_of_appointment?: string | null;
  home_courthouse_id?: number | null;
  reasonable_adjustments?: string | null;
  cluster?: string | null;
  bench?: string | null;
  presiding_justice?: boolean | null;
  retirement_on?: string | null;
  appraisal_status?: string | null;
  appraisal_cycle_years?: number | null;
  last_appraisal_on?: string | null;
  last_appraiser?: string | null;
  last_login_on?: string | null;
  days_since_login?: number | null;
  sitting_location_ids?: number[];
};

export function updateMagistrate(id: number, attrs: MagistrateUpdateAttrs) {
  return request<MagistrateDetail>(`/api/v1/magistrates/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ magistrate: attrs }),
  });
}

export function listCourthouses() {
  return request<Courthouse[]>("/api/v1/courthouses");
}

export function listMagistrateRoster() {
  return request<MagistrateRosterEntry[]>("/api/v1/magistrates/roster");
}
