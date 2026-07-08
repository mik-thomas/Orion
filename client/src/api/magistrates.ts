import { request } from "./http";
import type { Courthouse, MagistrateDetail, MagistrateSummary } from "../types/domain";

export function listMagistrates(q?: string) {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<MagistrateSummary[]>(`/api/v1/magistrates${params}`);
}

export function getMagistrate(id: number) {
  return request<MagistrateDetail>(`/api/v1/magistrates/${id}`);
}

export function listCourthouses() {
  return request<Courthouse[]>("/api/v1/courthouses");
}
