import { useMemo } from "react";
import { ChartLegend } from "./ChartLegend";
import {
  activeSegments,
  CHART_COLOURS,
  formatSegmentSummary,
  segmentTotal,
  type ChartSegment,
} from "./chartUtils";

type SimpleDonutProps = {
  segments: ChartSegment[];
  centreLabel?: string;
  emptyMessage?: string;
  summaryContext?: string;
  summaryId?: string;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export function SimpleDonut({
  segments,
  centreLabel,
  emptyMessage = "No data recorded.",
  summaryContext,
  summaryId,
}: SimpleDonutProps) {
  const active = useMemo(() => activeSegments(segments), [segments]);
  const total = segmentTotal(segments);
  const summaryText = formatSegmentSummary(segments, summaryContext);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 88;
  const innerRadius = 56;
  const strokeWidth = outerRadius - innerRadius;

  if (total === 0) {
    return <p className="govuk-body">{emptyMessage}</p>;
  }

  let currentAngle = 0;
  const arcs = active.map((segment) => {
    const sweep = (segment.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    return {
      segment,
      path: describeArc(cx, cy, (outerRadius + innerRadius) / 2, startAngle, endAngle),
      sweep,
    };
  });

  return (
    <>
      <p className="govuk-visually-hidden" id={summaryId}>
        {summaryText}
      </p>
      <figure aria-labelledby={summaryId} role="img" className="orion-chart__donut-figure">
        <svg
          className="orion-chart__svg orion-chart__svg--donut"
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {arcs.map(({ segment, path, sweep }) =>
            sweep >= 359.99 ? (
              <circle
                key={segment.key}
                cx={cx}
                cy={cy}
                r={(outerRadius + innerRadius) / 2}
                fill="none"
                stroke={segment.colour}
                strokeWidth={strokeWidth}
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </circle>
            ) : (
              <path
                key={segment.key}
                d={path}
                fill="none"
                stroke={segment.colour}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </path>
            )
          )}
          {centreLabel ? (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="orion-chart__donut-centre"
            >
              {centreLabel}
            </text>
          ) : null}
        </svg>
        <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
      </figure>
      <ChartLegend segments={active} />
    </>
  );
}

export function homeAwaySegments(atHome: number, away: number): ChartSegment[] {
  return [
    { key: "at_home", label: "At home court", value: atHome, colour: CHART_COLOURS.atHome },
    { key: "away", label: "Away from home", value: away, colour: CHART_COLOURS.away },
  ];
}
