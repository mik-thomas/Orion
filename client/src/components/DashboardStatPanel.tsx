import type { ReactNode } from "react";
import { DrillDownLink } from "./DrillDownLink";
import type { PeriodFilterState } from "../lib/periodFilter";
import type { SittingsDrillDownFilters } from "../lib/sittingsDrillDown";

export type DashboardStatTone = "green" | "yellow" | "red" | "grey";

export interface DashboardStatItem {
  label: string;
  value: ReactNode;
  tone?: DashboardStatTone;
}

interface DashboardStatPanelProps {
  cols: 1 | 3 | 4 | 5;
  items: DashboardStatItem[];
}

function DashboardStatCell({ label, value, tone }: DashboardStatItem) {
  const toneClass = tone ? ` orion-dashboard-stat__label--${tone}` : "";

  return (
    <div className="orion-dashboard-stat">
      <p
        className={`orion-dashboard-stat__label govuk-body-s govuk-!-font-weight-bold govuk-!-margin-bottom-0${toneClass}`}
      >
        {label}
      </p>
      <p className="orion-dashboard-stat__value govuk-!-margin-top-0 govuk-!-margin-bottom-0">{value}</p>
    </div>
  );
}

export function dashboardStatValue(value: number): ReactNode {
  if (value === 0) {
    return <span className="orion-dashboard-stat__zero">0</span>;
  }
  return value;
}

export function DashboardStatPanel({ cols, items }: DashboardStatPanelProps) {
  return (
    <div className={`orion-dashboard-stats orion-dashboard-stats--primary orion-dashboard-stats--cols-${cols}`}>
      {items.map((item) => (
        <DashboardStatCell key={item.label} {...item} />
      ))}
    </div>
  );
}

export function DashboardDrillDownValue({
  count,
  filters,
  period,
  ariaLabel,
}: {
  count: number;
  filters: SittingsDrillDownFilters;
  period: PeriodFilterState;
  ariaLabel: string;
}) {
  if (count === 0) {
    return <span className="orion-dashboard-stat__zero">0</span>;
  }

  return (
    <DrillDownLink filters={filters} period={period} ariaLabel={ariaLabel}>
      {count}
    </DrillDownLink>
  );
}
