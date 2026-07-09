import { useMemo } from "react";
import { ChartLegend } from "./ChartLegend";
import {
  activeSegments,
  CHART_COLOURS,
  formatSegmentSummary,
  segmentTotal,
  type ChartSegment,
} from "./chartUtils";

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
  const active = activeSegments(segments);
  const total = segmentTotal(segments);
  const summaryText = formatSegmentSummary(segments, summaryContext);

  if (total === 0) {
    return <p className="govuk-body">No sittings recorded for this period.</p>;
  }

  if (variant === "donut") {
    return (
      <DonutChart
        segments={segments}
        summaryText={summaryText}
        summaryId={summaryId}
        active={active}
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
          {active.map((segment) => {
            const width = (segment.value / total) * plotWidth;
            const rect = (
              <rect
                key={segment.key}
                x={xOffset}
                y={8}
                width={width}
                height={barHeight}
                fill={segment.colour}
                className="orion-chart__bar"
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </rect>
            );
            xOffset += width;
            return rect;
          })}
        </svg>
        <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
      </figure>
      <ChartLegend segments={active} />
    </>
  );
}

function DonutChart({
  segments,
  summaryText,
  summaryId,
  active,
}: {
  segments: ChartSegment[];
  summaryText: string;
  summaryId?: string;
  active: ChartSegment[];
}) {
  const total = segmentTotal(segments);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 88;
  const innerRadius = 56;
  const strokeWidth = outerRadius - innerRadius;

  let currentAngle = 0;
  const arcs = active.map((segment) => {
    const sweep = (segment.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    const start = polarToCartesian(cx, cy, (outerRadius + innerRadius) / 2, endAngle);
    const end = polarToCartesian(cx, cy, (outerRadius + innerRadius) / 2, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    const path = ["M", start.x, start.y, "A", (outerRadius + innerRadius) / 2, (outerRadius + innerRadius) / 2, 0, largeArcFlag, 0, end.x, end.y].join(" ");

    return { segment, path, sweep };
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
            {total}
          </text>
        </svg>
        <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
      </figure>
      <ChartLegend segments={active} />
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
