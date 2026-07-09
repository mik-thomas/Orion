import type { LeaveOfAbsence } from "../types/domain";

export type LoaReviewStatus = "ok" | "missing" | "overdue";

export function loaReviewStatus(leave: LeaveOfAbsence, asOf = new Date()): LoaReviewStatus {
  if (!leave.next_loa_review_on) return "missing";

  const reviewDate = new Date(`${leave.next_loa_review_on}T00:00:00`);
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  if (reviewDate < today) return "overdue";

  return "ok";
}

export function NextLoaReviewTag({ leave }: { leave: LeaveOfAbsence }) {
  const status = loaReviewStatus(leave);

  if (status === "missing") {
    return <strong className="govuk-tag govuk-tag--yellow">Not set</strong>;
  }

  if (status === "overdue") {
    return <strong className="govuk-tag govuk-tag--red">{leave.next_loa_review_on}</strong>;
  }

  return <span>{leave.next_loa_review_on}</span>;
}
