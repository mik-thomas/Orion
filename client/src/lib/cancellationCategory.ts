export const CANCELLATION_CATEGORIES = [
  "magistrate",
  "hmcts",
  "district_judge",
  "court",
  "unknown",
] as const;

export type CancellationCategory = (typeof CANCELLATION_CATEGORIES)[number];

export function isCancellationCategory(value: string | null): value is CancellationCategory {
  return value != null && (CANCELLATION_CATEGORIES as readonly string[]).includes(value);
}

const CANCELLED_LABELS: Record<CancellationCategory, string> = {
  magistrate: "Cancelled by magistrate",
  hmcts: "Cancelled by HMCTS",
  district_judge: "Cancelled by DJ",
  court: "Cancelled by court",
  unknown: "Cancelled",
};

const VACATED_LABELS: Record<CancellationCategory, string> = {
  magistrate: "Vacated by magistrate",
  hmcts: "Vacated by HMCTS",
  district_judge: "Vacated by DJ",
  court: "Vacated by court",
  unknown: "Vacated",
};

export function cancellationCategoryLabel(
  status: string,
  category: string | null | undefined
): string | null {
  if (!category || !isCancellationCategory(category)) return null;

  if (status === "cancelled") return CANCELLED_LABELS[category];
  if (status === "vacated") return VACATED_LABELS[category];
  return null;
}

export function cancellationCategoryHeading(status: string, category: CancellationCategory): string {
  if (status === "vacated") {
    return `${VACATED_LABELS[category]} sittings`;
  }
  return `${CANCELLED_LABELS[category]} sittings`;
}

/** GOV.UK tag colour modifier for actor-specific vacated/cancelled labels. */
export type CancellationTagColour = "orange" | "turquoise" | "red" | "grey" | "yellow";

const ACTOR_TAG_COLOURS: Record<CancellationCategory, CancellationTagColour> = {
  magistrate: "orange",
  hmcts: "turquoise",
  district_judge: "red",
  court: "grey",
  unknown: "yellow",
};

export function cancellationCategoryTagColour(
  status: string,
  category: string | null | undefined
): CancellationTagColour | null {
  if (!category || !isCancellationCategory(category)) return null;

  if (category === "unknown" && status === "cancelled") return "red";
  return ACTOR_TAG_COLOURS[category];
}
