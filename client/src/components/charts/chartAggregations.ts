import { CHART_COLOURS } from "./chartUtils";
import type { HorizontalBarRow } from "./HorizontalBarChart";
import type {
  CommitmentForecastRow,
  LeaveOfAbsence,
  MagistrateSummary,
  RetiringSoonRow,
} from "../../types/domain";
import { loaReviewStatus } from "../../lib/loaReview";

export function countByField(
  items: Array<{ label: string; value: number }>,
  emptyLabel = "Not recorded"
): HorizontalBarRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.label.trim() || emptyLabel;
    counts.set(label, (counts.get(label) ?? 0) + item.value);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({
      key: label,
      label,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function loginReportBucketRows(
  rows: Array<{ days_since_login: number | null }>
): HorizontalBarRow[] {
  let recent = 0;
  let warning = 0;
  let overdue = 0;
  let unknown = 0;

  for (const row of rows) {
    if (row.days_since_login == null) {
      unknown += 1;
    } else if (row.days_since_login >= 90) {
      overdue += 1;
    } else if (row.days_since_login >= 30) {
      warning += 1;
    } else {
      recent += 1;
    }
  }

  return [
    { key: "recent", label: "0–29 days", value: recent, colour: CHART_COLOURS.completed },
    { key: "warning", label: "30–89 days", value: warning, colour: "#f47738" },
    { key: "overdue", label: "90+ days", value: overdue, colour: CHART_COLOURS.cancelledByDj },
    { key: "unknown", label: "Not recorded", value: unknown, colour: CHART_COLOURS.barDefault },
  ].filter((row) => row.value > 0);
}

export function loaReasonRows(leaves: LeaveOfAbsence[]): HorizontalBarRow[] {
  return countByField(
    leaves.map((leave) => ({ label: leave.reason ?? "Not recorded", value: 1 }))
  );
}

export function loaReviewStatusRows(leaves: LeaveOfAbsence[]): HorizontalBarRow[] {
  let ok = 0;
  let overdue = 0;
  let missing = 0;

  for (const leave of leaves) {
    const status = loaReviewStatus(leave);
    if (status === "overdue") overdue += 1;
    else if (status === "missing") missing += 1;
    else ok += 1;
  }

  return [
    { key: "ok", label: "Review scheduled", value: ok, colour: CHART_COLOURS.completed },
    { key: "overdue", label: "Review overdue", value: overdue, colour: CHART_COLOURS.cancelledByDj },
    { key: "missing", label: "Review not set", value: missing, colour: "#f47738" },
  ].filter((row) => row.value > 0);
}

export function loaTimelineRows(leaves: LeaveOfAbsence[]): HorizontalBarRow[] {
  const counts = new Map<string, number>();

  for (const leave of leaves) {
    const month = leave.starts_on.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      key: month,
      label: month,
      value,
    }));
}

export function commitmentRiskRows(rows: CommitmentForecastRow[]): HorizontalBarRow[] {
  let onTrack = 0;
  let atRisk = 0;
  let unlikely = 0;

  for (const row of rows) {
    if (row.risk_level === "unlikely_to_meet") unlikely += 1;
    else if (row.risk_level === "at_risk") atRisk += 1;
    else onTrack += 1;
  }

  return [
    { key: "on_track", label: "On track", value: onTrack, colour: CHART_COLOURS.completed },
    { key: "at_risk", label: "At risk", value: atRisk, colour: "#f47738" },
    {
      key: "unlikely_to_meet",
      label: "Unlikely to meet",
      value: unlikely,
      colour: CHART_COLOURS.cancelledByDj,
    },
  ].filter((row) => row.value > 0);
}

export function magistrateComplianceRows(magistrates: MagistrateSummary[]): HorizontalBarRow[] {
  let onTrack = 0;
  let issues = 0;
  let onLeave = 0;
  let noData = 0;

  for (const magistrate of magistrates) {
    if (magistrate.active_leave) {
      onLeave += 1;
    } else if (magistrate.has_violations) {
      issues += 1;
    } else if (magistrate.sitting_commitment) {
      onTrack += 1;
    } else {
      noData += 1;
    }
  }

  return [
    { key: "on_track", label: "On track", value: onTrack, colour: CHART_COLOURS.completed },
    { key: "issues", label: "Compliance issues", value: issues, colour: CHART_COLOURS.cancelledByDj },
    { key: "on_leave", label: "On leave", value: onLeave, colour: "#f47738" },
    { key: "no_data", label: "No commitment data", value: noData, colour: CHART_COLOURS.barDefault },
  ].filter((row) => row.value > 0);
}

export function retiringSoonRows(rows: RetiringSoonRow[]): HorizontalBarRow[] {
  return [...rows]
    .sort((a, b) => a.days_until_retirement - b.days_until_retirement)
    .slice(0, 12)
    .map((row) => ({
      key: String(row.magistrate_id),
      label: row.display_name,
      value: row.days_until_retirement,
      colour: row.imminent ? CHART_COLOURS.cancelledByDj : "#f47738",
    }));
}

export function rosterHomeCourtRows(
  entries: Array<{ home_courthouse: string | null }>
): HorizontalBarRow[] {
  return countByField(
    entries.map((entry) => ({
      label: entry.home_courthouse ?? "Not recorded",
      value: 1,
    }))
  );
}
