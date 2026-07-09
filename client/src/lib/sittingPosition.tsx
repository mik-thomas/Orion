export function sittingPositionLabel(sittingPosition: string | null | undefined): string | null {
  switch (sittingPosition) {
    case "presiding_justice":
      return "PJ";
    case "winger":
      return "Winger";
    case "single_justice":
      return "Single Justice";
    default:
      return null;
  }
}

export function sittingPositionTagClass(sittingPosition: string | null | undefined): string {
  switch (sittingPosition) {
    case "presiding_justice":
      return "govuk-tag govuk-tag--blue";
    case "winger":
      return "govuk-tag govuk-tag--grey";
    case "single_justice":
      return "govuk-tag govuk-tag--purple";
    default:
      return "govuk-tag";
  }
}

export function SittingPositionCell({
  sittingPosition,
}: {
  sittingPosition: string | null | undefined;
}) {
  const label = sittingPositionLabel(sittingPosition);
  if (!label) return <>—</>;

  return <strong className={sittingPositionTagClass(sittingPosition)}>{label}</strong>;
}
