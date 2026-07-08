import type { ComplianceViolation } from "../types/domain";

interface ComplianceViolationsProps {
  violations: ComplianceViolation[];
  heading?: string;
}

export function ComplianceViolations({ violations, heading = "Compliance issues" }: ComplianceViolationsProps) {
  if (violations.length === 0) return null;

  return (
    <div className="govuk-!-margin-bottom-6">
      <h2 className="govuk-heading-l">{heading}</h2>
      <div className="govuk-error-summary" role="alert">
        <h3 className="govuk-error-summary__title">
          {violations.length} {violations.length === 1 ? "issue" : "issues"} found
        </h3>
        <div className="govuk-error-summary__body">
          <ul className="govuk-list govuk-error-summary__list">
            {violations.map((violation) => (
              <li key={`${violation.code}-${violation.year ?? "none"}`}>
                <strong className="govuk-tag govuk-tag--red govuk-!-margin-right-2">Violation</strong>
                {violation.message}
                {violation.actual != null && violation.required != null ? (
                  <span className="govuk-body-s govuk-!-display-block govuk-!-margin-top-1">
                    Recorded: {violation.actual} — required: {violation.required}
                    {violation.year ? ` (${violation.year})` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
