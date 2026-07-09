import type { ComplianceViolation, SittingCommitment } from "../types/domain";

interface ComplianceViolationsProps {
  violations: ComplianceViolation[];
  sittingCommitment?: SittingCommitment | null;
  heading?: string;
}

function formatFullDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function sittingCommitmentLabel(commitment: SittingCommitment) {
  const completed = formatFullDays(commitment.full_days_completed);
  const required = formatFullDays(commitment.full_days_required);
  const scope = commitment.multi_court ? "multi-court" : "single court";
  return `${completed}/${required} full days (${scope}, fiscal year ${commitment.fiscal_year_label})`;
}

export function ComplianceViolations({
  violations,
  sittingCommitment,
  heading = "Compliance issues",
}: ComplianceViolationsProps) {
  if (violations.length === 0 && !sittingCommitment) return null;

  return (
    <div className="govuk-!-margin-bottom-6">
      <h2 className="govuk-heading-l">{heading}</h2>

      {sittingCommitment ? (
        <p className="govuk-body govuk-!-margin-bottom-4">
          Sitting commitment (current year):{" "}
          <strong>{sittingCommitmentLabel(sittingCommitment)}</strong>
          {sittingCommitment.on_track ? (
            <span className="govuk-body-s govuk-!-display-block govuk-!-margin-top-1">
              On track for the fiscal year to date.
            </span>
          ) : (
            <span className="govuk-body-s govuk-!-display-block govuk-!-margin-top-1">
              Behind the prorated commitment of{" "}
              {formatFullDays(sittingCommitment.prorated_half_days_required / 2)} full days by this point in the
              year.
            </span>
          )}
        </p>
      ) : null}

      {violations.length === 0 ? null : (
        <div className="govuk-error-summary" role="alert">
          <h3 className="govuk-error-summary__title">
            {violations.length} {violations.length === 1 ? "issue" : "issues"} found
          </h3>
          <div className="govuk-error-summary__body">
            <ul className="govuk-list govuk-error-summary__list">
            {violations.map((violation) => (
              <li key={`${violation.code}-${violation.year ?? "none"}`}>
                <strong
                  className={`govuk-tag govuk-!-margin-right-2 ${
                    violation.severity === "yellow" ? "govuk-tag--yellow" : "govuk-tag--red"
                  }`}
                >
                  {violation.severity === "yellow" ? "Warning" : "Violation"}
                </strong>
                  {violation.message}
                  {violation.actual != null && violation.required != null ? (
                    <span className="govuk-body-s govuk-!-display-block govuk-!-margin-top-1">
                      Recorded: {violation.actual} half days — required by now: {violation.required} half days
                      {violation.year ? ` (fiscal year ${violation.year})` : ""}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
