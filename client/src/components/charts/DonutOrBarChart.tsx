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

type SittingStatusTotals = {
  completed: number;
  vacated: number;
  cancelled: number;
  cancelled_by_dj: number;
};

type DonutOrBarChartProps = {
  totals: SittingStatusTotals;
  summaryContext?: string;
  summaryId?: string;
  variant?: "bar" | "donut";
};

export function sittingStatusSegments(totals: SittingStatusTotals): ChartSegment[] {
  return [
    { key: "completed", label: "Completed", value: totals.completed, colour: CHART_COLOURS.completed },
    { key: "vacated", label: "Vacated", value: totals.vacated, colour: CHART_COLOURS.vacated },
    { key: "cancelled", label: "Cancelled", value: totals.cancelled, colour: CHART_COLOURS.cancelled },
    {
      key: "cancelled_by_dj",
      label: "Cancelled by DJ",
      value: totals.cancelled_by_dj,
      colour: CHART_COLOURS.cancelledByDj,
    },
  ];
}

export function DonutOrBarChart({
  totals,
  summaryContext,
  summaryId,
  variant = "bar",
}: DonutOrBarChartProps) {
  const segments = useMemo(() => sittingStatusSegments(totals), [totals]);
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

  if (total === 0) {
    return <p className="govuk-body">No sittings recorded for this period.</p>;
  }

  if (variant === "donut") {
    return (
      <DonutChart
        segments={segments}
        visibleTotal={visibleTotal}
        summaryText={summaryText}
        summaryId={summaryId}
        legendSegments={legendSegments}
        isVisible={isVisible}
        onToggle={toggle}
        onShowAll={showAll}
      />
    );
  }

  const chartWidth = 640;
  const chartHeight = 56;
  const marginLeft = 0;
  const marginRight = 0;
  const barHeight = 36;
  const plotWidth = chartWidth - marginLeft - marginRight;
  let xOffset = marginLeft;

  return (
    <>
      <p className="govuk-visually-hidden" id={summaryId}>
        {summaryText}
      </p>
      <figure aria-labelledby={summaryId} role="img">
        <svg
          className="orion-chart__svg"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {segments.map((segment, index) => {
            const segmentVisible = isVisible(segment.key) && segment.value > 0;
            const width =
              segmentVisible && visibleTotal > 0 ? (segment.value / visibleTotal) * plotWidth : 0;
            const rect = (
              <rect
                key={segment.key}
                x={xOffset}
                y={8}
                width={width}
                height={barHeight}
                fill={segment.colour}
                className={[
                  "orion-chart__bar",
                  segmentVisible ? "orion-chart__bar--enter" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ animationDelay: `${index * 60}ms`, opacity: segmentVisible ? 1 : 0 }}
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </rect>
            );
            if (segmentVisible) {
              xOffset += width;
            }
            return rect;
          })}
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

function DonutChart({
  segments,
  visibleTotal,
  summaryText,
  summaryId,
  legendSegments,
  isVisible,
  onToggle,
  onShowAll,
}: {
  segments: ChartSegment[];
  visibleTotal: number;
  summaryText: string;
  summaryId?: string;
  legendSegments: ChartSegment[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  onShowAll: () => void;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 88;
  const innerRadius = 56;
  const strokeWidth = outerRadius - innerRadius;

  let currentAngle = 0;
  const arcs = segments.map((segment, index) => {
    const segmentVisible = isVisible(segment.key) && segment.value > 0;
    const sweep = segmentVisible && visibleTotal > 0 ? (segment.value / visibleTotal) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    if (segmentVisible) {
      currentAngle = endAngle;
    }

    const start = polarToCartesian(cx, cy, (outerRadius + innerRadius) / 2, endAngle);
    const end = polarToCartesian(cx, cy, (outerRadius + innerRadius) / 2, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    const path = [
      "M",
      start.x,
      start.y,
      "A",
      (outerRadius + innerRadius) / 2,
      (outerRadius + innerRadius) / 2,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");

    return { segment, path, sweep, segmentVisible, index };
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
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="orion-chart__donut-centre"
          >
            {visibleTotal}
          </text>
        </svg>
        <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
      </figure>
      <ChartLegend
        segments={legendSegments}
        isVisible={isVisible}
        onToggle={onToggle}
        onShowAll={onShowAll}
        interactive
      />
    </>
  );
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}
