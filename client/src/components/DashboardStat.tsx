import type { ReactNode } from "react";

type DashboardStatVariant = "default" | "green" | "yellow" | "red" | "grey";

interface DashboardStatProps {
  label: string;
  variant?: DashboardStatVariant;
  children: ReactNode;
}

export function DashboardStat({ label, variant = "default", children }: DashboardStatProps) {
  const variantClass = variant === "default" ? "" : ` orion-dashboard-stat--${variant}`;

  return (
    <div className={`orion-dashboard-stat${variantClass}`}>
      <p className="orion-dashboard-stat__label govuk-body-s govuk-!-font-weight-bold govuk-!-margin-bottom-1">
        {label}
      </p>
      <p className="orion-dashboard-stat__value govuk-heading-xl govuk-!-margin-top-0 govuk-!-margin-bottom-0">
        {children}
      </p>
    </div>
  );
}
