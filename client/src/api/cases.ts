import { request } from "./http";
import type { CaseDetail, CaseSummary } from "../types/domain";

export type CasePayload = {
  title?: string;
  reference?: string | null;
  status?: string;
  summary?: string | null;
  case_type?: string | null;
};

export function listMagistrateCases(magistrateId: number) {
  return request<CaseSummary[]>(`/api/v1/magistrates/${magistrateId}/cases`);
}

export function getCase(id: number | string) {
  return request<CaseDetail>(`/api/v1/cases/${encodeURIComponent(String(id))}`);
}

export function createCase(magistrateId: number, casePayload: CasePayload) {
  return request<CaseDetail>(`/api/v1/magistrates/${magistrateId}/cases`, {
    method: "POST",
    body: JSON.stringify({ case: casePayload }),
  });
}

export function updateCase(id: number | string, casePayload: CasePayload) {
  return request<CaseDetail>(`/api/v1/cases/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify({ case: casePayload }),
  });
}

export function destroyCase(id: number | string) {
  return request<void>(`/api/v1/cases/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}
