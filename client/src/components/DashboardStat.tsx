import type { ReactNode } from "react";
import type { DashboardTagColour } from "./DashboardSection";

type DashboardStatVariant = "default" | "green" | "yellow" | "red" | "grey";

interface DashboardStatProps {
  label: string;
  labelTag?: { text: string; colour: DashboardTagColour };
  variant?: DashboardStatVariant;
  children: ReactNode;
}

export function DashboardStat({ label, labelTag, variant = "default", children }: DashboardStatProps) {
  const variantClass = variant === "default" ? "" : ` orion-dashboard-stat--${variant}`;

  return (
    <div className={`orion-dashboard-stat${variantClass}`}>
      <p className="orion-dashboard-stat__label">
        {labelTag ? (
          <strong className={`govuk-tag govuk-tag--${labelTag.colour}`}>{labelTag.text}</strong>
        ) : (
          label
        )}
      </p>
      <p className="orion-dashboard-stat__value govuk-!-margin-top-0 govuk-!-margin-bottom-0">{children}</p>
    </div>
  );
}
