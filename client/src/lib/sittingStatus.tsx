import type { SittingDrillDownRow } from "../types/domain";
import { cancellationCategoryLabel, cancellationCategoryTagColour } from "./cancellationCategory";

export function sittingStatusLabel(sitting: {
  status: string;
  cancellation_category?: string | null;
}): string {
  const categoryLabel = cancellationCategoryLabel(sitting.status, sitting.cancellation_category);
  if (categoryLabel) return categoryLabel;

  switch (sitting.status) {
    case "completed":
      return "Completed";
    case "vacated":
      return "Vacated";
    case "cancelled":
      return "Cancelled";
    default:
      return sitting.status;
  }
}

function statusTagClass(status: string, cancellationCategory?: string | null): string {
  const categoryColour = cancellationCategoryTagColour(status, cancellationCategory);
  if (categoryColour) return `govuk-tag govuk-tag--${categoryColour}`;

  if (status === "vacated") return "govuk-tag govuk-tag--yellow";
  if (status === "cancelled") return "govuk-tag govuk-tag--red";
  return "govuk-tag";
}

export function SittingStatusCell({
  sitting,
}: {
  sitting: Pick<SittingDrillDownRow, "status" | "cancellation_category">;
}) {
  const label = sittingStatusLabel(sitting);

  if (sitting.status === "completed") {
    return <>{label}</>;
  }

  return (
    <strong className={statusTagClass(sitting.status, sitting.cancellation_category)}>{label}</strong>
  );
}
