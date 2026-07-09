import { useMemo } from "react";
import { ChartLegend } from "./ChartLegend";
import {
  activeSegments,
  CHART_COLOURS,
  formatSegmentSummary,
  segmentTotal,
  visibleSegments,
  type ChartSegment,
} from "./chartUtils";
import { useChartFilter } from "./useChartFilter";

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
  const legendSegments = useMemo(() => activeSegments(segments), [segments]);
  const filterKeys = useMemo(() => legendSegments.map((segment) => segment.key), [legendSegments]);
  const { toggle, showAll, isVisible } = useChartFilter(filterKeys);

  const visible = useMemo(
    () => activeSegments(visibleSegments(segments, isVisible)),
    [segments, isVisible]
  );
  const total = segmentTotal(segments);
  const visibleTotal = segmentTotal(visible);
  const summaryText = formatSegmentSummary(segments, summaryContext, isVisible);

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
  const arcs = segments.map((segment, index) => {
    const segmentVisible = isVisible(segment.key) && segment.value > 0;
    const sweep = segmentVisible && visibleTotal > 0 ? (segment.value / visibleTotal) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    if (segmentVisible) {
      currentAngle = endAngle;
    }

    return {
      segment,
      path: describeArc(cx, cy, (outerRadius + innerRadius) / 2, startAngle, endAngle),
      sweep,
      segmentVisible,
      index,
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
          {arcs.map(({ segment, path, sweep, segmentVisible, index }) =>
            !segmentVisible ? (
              <path
                key={segment.key}
                d={path}
                fill="none"
                stroke={segment.colour}
                strokeWidth={strokeWidth}
                className="orion-chart__donut-segment orion-chart__donut-segment--hidden"
              />
            ) : sweep >= 359.99 ? (
              <circle
                key={segment.key}
                cx={cx}
                cy={cy}
                r={(outerRadius + innerRadius) / 2}
                fill="none"
                stroke={segment.colour}
                strokeWidth={strokeWidth}
                className={[
                  "orion-chart__donut-segment",
                  "orion-chart__donut-segment--enter",
                ].join(" ")}
                style={{ animationDelay: `${index * 70}ms` }}
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
                className={[
                  "orion-chart__donut-segment",
                  "orion-chart__donut-segment--enter",
                ].join(" ")}
                style={{ animationDelay: `${index * 70}ms` }}
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
      <ChartLegend
        segments={legendSegments}
        isVisible={isVisible}
        onToggle={toggle}
        onShowAll={showAll}
        interactive
      />
    </>
  );
}

export function homeAwaySegments(atHome: number, away: number): ChartSegment[] {
  return [
    { key: "at_home", label: "At home court", value: atHome, colour: CHART_COLOURS.atHome },
    { key: "away", label: "Away from home", value: away, colour: CHART_COLOURS.away },
  ];
}
