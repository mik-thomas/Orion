import type { SittingDrillDownRow } from "../types/domain";

export function sittingStatusLabel(sitting: {
  status: string;
  cancellation_category?: string | null;
}): string {
  if (sitting.status === "cancelled" && sitting.cancellation_category === "district_judge") {
    return "Cancelled by DJ";
  }

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

export function SittingStatusCell({ sitting }: { sitting: SittingDrillDownRow }) {
  if (sitting.status === "cancelled" && sitting.cancellation_category === "district_judge") {
    return <strong className="govuk-tag govuk-tag--red">Cancelled by DJ</strong>;
  }
  if (sitting.status === "vacated") {
    return <strong className="govuk-tag govuk-tag--yellow">Vacated</strong>;
  }
  if (sitting.status === "cancelled") {
    return <strong className="govuk-tag govuk-tag--red">Cancelled</strong>;
  }
  return <>{sittingStatusLabel(sitting)}</>;
}
