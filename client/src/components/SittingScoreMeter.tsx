import { useId, useMemo } from "react";
import type { CSSProperties } from "react";
import type { SittingScore, SittingScoreRating } from "../types/domain";
import { SortableTableHeader } from "./SortableTableHeader";
import { useTableSort } from "../lib/useTableSort";

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
      return "govuk-tag--blue";
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
  const breakdownId = useId();
  const headingId = useId();
  const breakdown = sittingScore?.breakdown ?? [];
  const sortColumns = useMemo(
    () => ({
      label: { getValue: (item: (typeof breakdown)[number]) => item.label },
      points: { getValue: (item: (typeof breakdown)[number]) => item.points, type: "number" as const },
      detail: { getValue: (item: (typeof breakdown)[number]) => item.detail ?? "" },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(breakdown, sortColumns, {
    key: "points",
    direction: "desc",
  });

  if (!sittingScore) return null;

  const position = scorePosition(sittingScore.score);
  const needleAngle = (position / 100) * 180;
  const gaugeStyle = { "--needle-angle": `${needleAngle}deg` } as CSSProperties;

  return (
    <section className="orion-sitting-score govuk-!-margin-bottom-6" aria-labelledby={headingId}>
      <div className="orion-sitting-score__header">
        <h2 className="govuk-heading-l orion-sitting-score__title" id={headingId}>
          Sitting score
        </h2>
        <strong className="govuk-tag govuk-tag--grey orion-sitting-score__year">{sittingScore.fiscal_year_label}</strong>
      </div>
      <p className="govuk-body govuk-hint orion-sitting-score__intro">
        Credit-style score based on completion, reliability, and commitment balance.
      </p>

      <div className="orion-sitting-score__panel">
        <div
          className="orion-sitting-score__gauge"
          role="img"
          aria-label={`Sitting score ${sittingScore.score} out of ${SCORE_MAX}, rated ${sittingScore.rating}`}
        >
          <svg className="orion-sitting-score__arc" viewBox="0 0 200 108" aria-hidden="true">
            <path className="orion-sitting-score__arc-bg" d="M 24 96 A 76 76 0 0 1 176 96" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--poor" d="M 24 96 A 76 76 0 0 1 70 38" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--fair" d="M 70 38 A 76 76 0 0 1 108 24" />
            <path className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--good" d="M 108 24 A 76 76 0 0 1 146 38" />
            <path
              className="orion-sitting-score__arc-zone orion-sitting-score__arc-zone--excellent"
              d="M 146 38 A 76 76 0 0 1 176 96"
            />
            <text className="orion-sitting-score__arc-label" x="18" y="106">
              {SCORE_MIN}
            </text>
            <text className="orion-sitting-score__arc-label" x="182" y="106" textAnchor="end">
              {SCORE_MAX}
            </text>
            <g className="orion-sitting-score__needle-group orion-sitting-score__needle-group--animate" style={gaugeStyle}>
              <line className="orion-sitting-score__needle" x1="100" y1="96" x2="100" y2="34" />
              <circle className="orion-sitting-score__hub" cx="100" cy="96" r="4" />
            </g>
          </svg>

          <p className="orion-sitting-score__value govuk-heading-xl" aria-hidden="true">
            {sittingScore.score}
          </p>
        </div>

        <div className="orion-sitting-score__summary">
          <p className="govuk-body-l govuk-!-margin-bottom-2">
            <strong className={`govuk-tag ${ratingTagClass(sittingScore.rating)}`}>{sittingScore.rating}</strong>
          </p>
          <p className="govuk-body-s govuk-!-margin-bottom-0 orion-sitting-score__description">
            Range {SCORE_MIN}–{SCORE_MAX}. Higher scores reflect reliable completion without excessive over-sitting.
          </p>
        </div>
      </div>

      <details className="govuk-details orion-sitting-score__details">
        <summary className="govuk-details__summary">
          <span className="govuk-details__summary-text">How is this calculated?</span>
        </summary>
        <div className="govuk-details__text" id={breakdownId}>
          <table className="govuk-table govuk-!-margin-bottom-0">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="label" sort={sort} onSort={toggleSort}>
                  Factor
                </SortableTableHeader>
                <SortableTableHeader columnKey="points" sort={sort} onSort={toggleSort} numeric>
                  Points
                </SortableTableHeader>
                <SortableTableHeader columnKey="detail" sort={sort} onSort={toggleSort}>
                  Detail
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedData.map((item) => (
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
        </div>
      </details>
    </section>
  );
}
