import { useMemo } from "react";
import { ChartLegend } from "./ChartLegend";
import {
  activeSegments,
  CHART_COLOURS,
  formatSegmentSummary,
  segmentTotal,
  type ChartSegment,
} from "./chartUtils";

export type StackedBarRow = {
  key: string;
  label: string;
  segments: ChartSegment[];
};

type StackedBarChartProps = {
  rows: StackedBarRow[];
  emptyMessage?: string;
  summaryContext?: string;
  summaryId?: string;
  maxRows?: number;
};

const DEFAULT_STACK_SEGMENTS: Omit<ChartSegment, "value">[] = [
  { key: "completed", label: "Completed", colour: CHART_COLOURS.completed },
  { key: "vacated", label: "Vacated", colour: CHART_COLOURS.vacated },
  { key: "cancelled", label: "Cancelled", colour: CHART_COLOURS.cancelled },
];

export function courtRoomStackRow(
  courthouse: string,
  courtRoom: string,
  counts: { completed: number; vacated: number; cancelled: number }
): StackedBarRow {
  const label = `${courthouse} — ${courtRoom}`;
  return {
    key: `${courthouse}-${courtRoom}`,
    label,
    segments: [
      { ...DEFAULT_STACK_SEGMENTS[0], value: counts.completed },
      { ...DEFAULT_STACK_SEGMENTS[1], value: counts.vacated },
      { ...DEFAULT_STACK_SEGMENTS[2], value: counts.cancelled },
    ],
  };
}

export function StackedBarChart({
  rows,
  emptyMessage = "No data recorded.",
  summaryContext,
  summaryId,
  maxRows = 12,
}: StackedBarChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...rows]
      .sort((a, b) => segmentTotal(b.segments) - segmentTotal(a.segments))
      .slice(0, maxRows);
    const maxTotal = sorted.reduce((max, row) => Math.max(max, segmentTotal(row.segments)), 0);

    const legendTotals = new Map<string, ChartSegment>();
    for (const row of sorted) {
      for (const segment of row.segments) {
        const existing = legendTotals.get(segment.key);
        if (existing) {
          existing.value += segment.value;
        } else {
          legendTotals.set(segment.key, { ...segment });
        }
      }
    }

    const legend = DEFAULT_STACK_SEGMENTS.map((template) => {
      const segment = legendTotals.get(template.key);
      return segment ?? { ...template, value: 0 };
    });

    return { sorted, maxTotal, legend: activeSegments(legend) };
  }, [rows, maxRows]);

  const summaryText = formatSegmentSummary(chartData.legend, summaryContext);

  const chartWidth = 640;
  const chartHeight = Math.max(120, chartData.sorted.length * 36 + 24);
  const marginLeft = 168;
  const marginRight = 48;
  const marginTop = 8;
  const barHeight = 22;
  const barGap = 14;
  const plotWidth = chartWidth - marginLeft - marginRight;

  if (rows.length === 0) {
    return <p className="govuk-body">{emptyMessage}</p>;
  }

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
          {chartData.sorted.map((row, index) => {
            const y = marginTop + index * (barHeight + barGap);
            const rowTotal = segmentTotal(row.segments);
            let xOffset = marginLeft;
            const displayLabel = row.label.length > 22 ? `${row.label.slice(0, 20)}…` : row.label;

            return (
              <g key={row.key}>
                <text
                  x={marginLeft - 8}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  className="orion-chart__axis-label"
                >
                  {displayLabel}
                </text>
                <rect
                  x={marginLeft}
                  y={y}
                  width={plotWidth}
                  height={barHeight}
                  fill="#f3f2f1"
                  stroke={CHART_COLOURS.grid}
                  strokeWidth={1}
                />
                {(() => {
                  const barWidth =
                    chartData.maxTotal > 0 ? (rowTotal / chartData.maxTotal) * plotWidth : 0;
                  return activeSegments(row.segments).map((segment) => {
                    const width = rowTotal > 0 ? (segment.value / rowTotal) * barWidth : 0;
                    const rect = (
                      <rect
                        key={segment.key}
                        x={xOffset}
                        y={y}
                        width={width}
                        height={barHeight}
                        fill={segment.colour}
                        className="orion-chart__bar"
                      >
                        <title>{`${row.label}: ${segment.value} ${segment.label.toLowerCase()}`}</title>
                      </rect>
                    );
                    xOffset += width;
                    return rect;
                  });
                })()}
                <text
                  x={
                    marginLeft +
                    (chartData.maxTotal > 0 ? (rowTotal / chartData.maxTotal) * plotWidth : 0) +
                    6
                  }
                  y={y + barHeight / 2 + 4}
                  className="orion-chart__axis-label"
                >
                  {rowTotal}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
      </figure>
      <ChartLegend segments={chartData.legend} />
    </>
  );
}
