/** Amber “!” badge when a magistrate has support needs / reasonable adjustments recorded. */
export function hasSupportNeeds(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function SupportNeedsAlert({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`orion-support-needs-alert ${className}`.trim()}
      title="Support needs recorded"
      aria-label="Support needs recorded"
      role="img"
    >
      <span className="orion-support-needs-alert__bang" aria-hidden="true">
        !
      </span>
    </span>
  );
}
