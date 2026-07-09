import { useMemo } from "react";
import { ChartLegend } from "./ChartLegend";
import {
  activeSegments,
  barColourByIndex,
  CHART_COLOURS,
  formatSegmentSummary,
  segmentTotal,
  type ChartSegment,
} from "./chartUtils";

export type HorizontalBarRow = {
  key: string;
  label: string;
  value: number;
  colour?: string;
};

type HorizontalBarChartProps = {
  rows: HorizontalBarRow[];
  emptyMessage?: string;
  summaryContext?: string;
  summaryId?: string;
  maxBars?: number;
};

export function HorizontalBarChart({
  rows,
  emptyMessage = "No data recorded.",
  summaryContext,
  summaryId,
  maxBars = 12,
}: HorizontalBarChartProps) {
  const chartRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, maxBars);
    const maxValue = sorted.reduce((max, row) => Math.max(max, row.value), 0);
    return { sorted, maxValue };
  }, [rows, maxBars]);

  const segments: ChartSegment[] = chartRows.sorted.map((row, index) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    colour: row.colour ?? barColourByIndex(index),
  }));

  const summaryText = formatSegmentSummary(segments, summaryContext);
  const chartWidth = 640;
  const chartHeight = Math.max(120, chartRows.sorted.length * 36 + 24);
  const marginLeft = 140;
  const marginRight = 48;
  const marginTop = 8;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const barHeight = 22;
  const barGap = 14;

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
          {chartRows.sorted.map((row, index) => {
            const y = marginTop + index * (barHeight + barGap);
            const barWidth =
              chartRows.maxValue > 0 ? (row.value / chartRows.maxValue) * plotWidth : 0;
            const colour = row.colour ?? barColourByIndex(index);

            return (
              <g key={row.key}>
                <text
                  x={marginLeft - 8}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  className="orion-chart__axis-label"
                >
                  {row.label.length > 18 ? `${row.label.slice(0, 16)}…` : row.label}
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
                <rect
                  x={marginLeft}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colour}
                  className="orion-chart__bar"
                >
                  <title>{`${row.label}: ${row.value}`}</title>
                </rect>
                <text
                  x={marginLeft + barWidth + 6}
                  y={y + barHeight / 2 + 4}
                  className="orion-chart__axis-label"
                >
                  {row.value}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
      </figure>
      <ChartLegend segments={activeSegments(segments)} />
    </>
  );
}

export { segmentTotal };
