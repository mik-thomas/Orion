import type { ReactNode } from "react";

type DashboardStatTone = "green" | "yellow" | "red" | "grey";
type DashboardStatSize = "primary" | "secondary";

interface DashboardStatProps {
  label: string;
  /** @deprecated Use `tone` instead — kept for existing call sites */
  variant?: "default" | DashboardStatTone;
  tone?: DashboardStatTone;
  size?: DashboardStatSize;
  children: ReactNode;
}

function resolveTone(
  variant: DashboardStatProps["variant"],
  tone?: DashboardStatTone,
): DashboardStatTone | undefined {
  if (tone) return tone;
  if (!variant || variant === "default") return undefined;
  return variant;
}

export function DashboardStat({
  label,
  variant = "default",
  tone,
  size = "primary",
  children,
}: DashboardStatProps) {
  const resolvedTone = resolveTone(variant, tone);
  const toneClass = resolvedTone ? ` orion-dashboard-stat__label--${resolvedTone}` : "";
  const sizeClass = size === "secondary" ? " orion-dashboard-stat--secondary" : "";

  return (
    <div className={`orion-dashboard-stat${sizeClass}`}>
      <p
        className={`orion-dashboard-stat__label govuk-body-s govuk-!-font-weight-bold govuk-!-margin-bottom-2${toneClass}`}
      >
        {label}
      </p>
      <p className="orion-dashboard-stat__value govuk-!-margin-top-0 govuk-!-margin-bottom-0">{children}</p>
    </div>
  );
}
