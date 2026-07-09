import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PeriodFilterState } from "../lib/periodFilter";
import { sittingsDrillDownPath, type SittingsDrillDownFilters } from "../lib/sittingsDrillDown";

interface DrillDownLinkProps {
  filters: SittingsDrillDownFilters;
  period?: PeriodFilterState;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function DrillDownLink({
  filters,
  period,
  children,
  ariaLabel,
  className = "govuk-link",
}: DrillDownLinkProps) {
  return (
    <Link to={sittingsDrillDownPath(filters, period)} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
