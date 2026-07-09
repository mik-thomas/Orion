import { request } from "./http";
import type { LeaveOfAbsence } from "../types/domain";

export interface LeaveOfAbsenceUpdate {
  next_review_on?: string | null;
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
