import { request } from "./http";
import type { LeaveOfAbsence } from "../types/domain";

export interface LeaveOfAbsenceCreate {
  starts_on: string;
  ends_on?: string | null;
  reason?: string | null;
  notes?: string | null;
  next_review_on?: string | null;
}

export interface LeaveOfAbsenceUpdate {
  next_review_on?: string | null;
  returned_on?: string | null;
  starts_on?: string;
  ends_on?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export function createLeaveOfAbsence(magistrateId: number, payload: LeaveOfAbsenceCreate) {
  return request<LeaveOfAbsence>(`/api/v1/magistrates/${magistrateId}/leaves_of_absence`, {
    method: "POST",
    body: JSON.stringify({ leave_of_absence: payload }),
  });
}

export function updateLeaveOfAbsence(
  magistrateId: number,
  leaveId: number,
  patch: LeaveOfAbsenceUpdate
) {
  return request<LeaveOfAbsence>(
    `/api/v1/magistrates/${magistrateId}/leaves_of_absence/${leaveId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ leave_of_absence: patch }),
    }
  );
}
