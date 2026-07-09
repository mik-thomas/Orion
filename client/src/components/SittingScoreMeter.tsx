import { useId, useState } from "react";
import type { SittingScore, SittingScoreRating } from "../types/domain";

interface SittingScoreMeterProps {
  sittingScore: SittingScore | null;
}

const SCORE_MIN = 300;
const SCORE_MAX = 850;

function ratingTagClass(rating: SittingScoreRating): string {
  switch (rating) {
    case "Excellent":
      return "govuk-tag--green";
    case "Good":
      return "govuk-tag--turquoise";
    case "Fair":
      return "govuk-tag--yellow";
    case "Poor":
      return "govuk-tag--red";
  }
}

function scorePosition(score: number): number {
  return ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
}

function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return String(points);
}

export function SittingScoreMeter({ sittingScore }: SittingScoreMeterProps) {
  const [expanded, setExpanded] = useState(false);
  const breakdownId = useId();
  const headingId = useId();

  if (!sittingScore) return null;

  const position = scorePosition(sittingScore.score);
  const adjustableFactors = sittingScore.breakdown.filter((item) => item.factor !== "base");

  return (
    <section className="orion-sitting-score govuk-!-margin-bottom-6" aria-labelledby={headingId}>
      <h2 className="govuk-heading-l" id={headingId}>
        Sitting score
      </h2>
      <p className="govuk-body govuk-hint govuk-!-margin-bottom-4">
        Credit-style score for {sittingScore.fiscal_year_label} based on completion, reliability, and
        commitment balance.
      </p>

      <div className="orion-sitting-score__panel">
        <div className="orion-sitting-score__gauge" role="img" aria-label={`Sitting score ${sittingScore.score}, ${sittingScore.rating}`}>
          <svg className="orion-sitting-score__arc" viewBox="0 0 200 110" aria-hidden="true">
            <path className="orion-sitting-score__arc-track" d="M 20 100 A 80 80 0 0 1 180 100" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--poor" d="M 20 100 A 80 80 0 0 1 68 36" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--fair" d="M 68 36 A 80 80 0 0 1 110 20" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--good" d="M 110 20 A 80 80 0 0 1 152 36" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--excellent" d="M 152 36 A 80 80 0 0 1 180 100" />
            <line
              className="orion-sitting-score__needle"
              x1="100"
              y1="100"
              x2="100"
              y2="28"
              transform={`rotate(${-90 + (position / 100) * 180} 100 100)`}
            />
            <circle className="orion-sitting-score__hub" cx="100" cy="100" r="6" />
          </svg>

          <p className="orion-sitting-score__value" aria-hidden="true">
            {sittingScore.score}
          </p>
        </div>

        <div className="orion-sitting-score__summary">
          <p className="govuk-body govuk-!-margin-bottom-2">
            <strong className={`govuk-tag ${ratingTagClass(sittingScore.rating)}`}>
              {sittingScore.rating}
            </strong>
          </p>
          <p className="govuk-body-s govuk-!-margin-bottom-0">
            Range {SCORE_MIN}–{SCORE_MAX}. Higher scores reflect reliable completion without excessive
            over-sitting.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="govuk-link govuk-body-s orion-sitting-score__toggle"
        aria-expanded={expanded}
        aria-controls={breakdownId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Hide score breakdown" : "Show score breakdown"}
      </button>

      {expanded ? (
        <div id={breakdownId}>
          <h3 className="govuk-heading-s govuk-!-margin-top-4">How this score is calculated</h3>
          <table className="govuk-table govuk-!-margin-bottom-0">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Factor
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Points
                </th>
                <th scope="col" className="govuk-table__header">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sittingScore.breakdown.map((item) => (
                <tr className="govuk-table__row" key={item.factor}>
                  <td className="govuk-table__cell">{item.label}</td>
                  <td
                    className={`govuk-table__cell govuk-table__cell--numeric ${
                      item.points > 0
                        ? "orion-sitting-score__points--positive"
                        : item.points < 0
                          ? "orion-sitting-score__points--negative"
                          : ""
                    }`}
                  >
                    {formatPoints(item.points)}
                  </td>
                  <td className="govuk-table__cell">{item.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="govuk-list govuk-!-margin-top-4 govuk-body-s">
            {adjustableFactors.map((item) => (
              <li key={`hint-${item.factor}`}>
                <strong>{item.label}:</strong> {item.detail ?? "No impact"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
