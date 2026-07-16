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

/** Matches Orion::MagistrateSittingScore::RATINGS thresholds. */
const ZONE_BREAKS = [SCORE_MIN, 550, 650, 750, SCORE_MAX] as const;
const ZONE_KEYS = ["poor", "fair", "good", "excellent"] as const;

const ARC_CX = 100;
const ARC_CY = 98;
const ARC_R = 74;
const NEEDLE_LENGTH = 58;

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

function scoreFraction(score: number): number {
  const clamped = Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
  return (clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
}

function scorePosition(score: number): number {
  return scoreFraction(score) * 100;
}

/** Point on the semicircle: score min at left (−π), max at right (0), arc above the diameter. */
function arcPoint(score: number): { x: number; y: number } {
  const theta = Math.PI * (1 - scoreFraction(score));
  return {
    x: ARC_CX + ARC_R * Math.cos(theta),
    y: ARC_CY - ARC_R * Math.sin(theta),
  };
}

function arcSegmentPath(fromScore: number, toScore: number): string {
  const start = arcPoint(fromScore);
  const end = arcPoint(toScore);
  const largeArc = scoreFraction(toScore) - scoreFraction(fromScore) > 0.5 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${ARC_R} ${ARC_R} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** Slight overlap hides anti-aliased hairline gaps between abutting strokes. */
function zoneSegmentPath(index: number): string {
  const from = ZONE_BREAKS[index];
  const to = ZONE_BREAKS[index + 1];
  const overlap = 2;
  const fromAdj = index === 0 ? from : from - overlap;
  const toAdj = index === ZONE_KEYS.length - 1 ? to : to + overlap;
  return arcSegmentPath(fromAdj, toAdj);
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
  const minLabel = arcPoint(SCORE_MIN);
  const maxLabel = arcPoint(SCORE_MAX);
  const needleTipY = ARC_CY - NEEDLE_LENGTH;

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
          <svg className="orion-sitting-score__arc" viewBox="0 0 200 118" aria-hidden="true">
            {ZONE_KEYS.map((key, index) => (
              <path
                key={key}
                className={`orion-sitting-score__arc-zone orion-sitting-score__arc-zone--${key}`}
                d={zoneSegmentPath(index)}
              />
            ))}
            {/* Rounded outer caps (half stroke-width) without rounding zone joins */}
            <circle className="orion-sitting-score__arc-cap--poor" cx={minLabel.x} cy={minLabel.y} r="5" />
            <circle className="orion-sitting-score__arc-cap--excellent" cx={maxLabel.x} cy={maxLabel.y} r="5" />
            <text
              className="orion-sitting-score__arc-label"
              x={minLabel.x - 2}
              y={minLabel.y + 16}
              textAnchor="start"
            >
              {SCORE_MIN}
            </text>
            <text
              className="orion-sitting-score__arc-label"
              x={maxLabel.x + 2}
              y={maxLabel.y + 16}
              textAnchor="end"
            >
              {SCORE_MAX}
            </text>
            <g
              className="orion-sitting-score__needle-group orion-sitting-score__needle-group--animate"
              style={gaugeStyle}
            >
              <line
                className="orion-sitting-score__needle"
                x1={ARC_CX}
                y1={ARC_CY}
                x2={ARC_CX}
                y2={needleTipY}
              />
              <circle className="orion-sitting-score__hub" cx={ARC_CX} cy={ARC_CY} r="3.5" />
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
