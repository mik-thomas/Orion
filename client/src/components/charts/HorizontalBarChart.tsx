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
import { useChartFilter } from "./useChartFilter";

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
    return { sorted };
  }, [rows, maxBars]);

  const segments: ChartSegment[] = chartRows.sorted.map((row, index) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    colour: row.colour ?? barColourByIndex(index),
  }));

  const legendSegments = useMemo(() => activeSegments(segments), [segments]);
  const filterKeys = useMemo(() => legendSegments.map((segment) => segment.key), [legendSegments]);
  const { toggle, showAll, isVisible } = useChartFilter(filterKeys);

  const visibleRows = useMemo(
    () => chartRows.sorted.filter((row) => isVisible(row.key)),
    [chartRows.sorted, isVisible]
  );

  const maxValue = useMemo(
    () => visibleRows.reduce((max, row) => Math.max(max, row.value), 0),
    [visibleRows]
  );

  const summaryText = formatSegmentSummary(segments, summaryContext, isVisible);
  const chartWidth = 640;
  const chartHeight = Math.max(120, visibleRows.length * 36 + 24);
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
          {visibleRows.map((row, displayIndex) => {
            const sourceIndex = chartRows.sorted.findIndex((sortedRow) => sortedRow.key === row.key);
            const y = marginTop + displayIndex * (barHeight + barGap);
            const barWidth = maxValue > 0 ? (row.value / maxValue) * plotWidth : 0;
            const colour = row.colour ?? barColourByIndex(sourceIndex);

            return (
              <g key={row.key} className="orion-chart__bar-row">
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
                  className={["orion-chart__bar", "orion-chart__bar--enter"].join(" ")}
                  style={{ animationDelay: `${displayIndex * 50}ms` }}
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

export { segmentTotal };
