import { useMemo } from "react";
import { isCancellationCategory } from "../lib/cancellationCategory";
import type { Sitting } from "../types/domain";
import { DashboardSection } from "./DashboardSection";

type ChartSegment =
  | "completed"
  | "vacated_magistrate"
  | "vacated_hmcts"
  | "vacated_district_judge"
  | "vacated_court"
  | "vacated_unknown"
  | "cancelled_magistrate"
  | "cancelled_hmcts"
  | "cancelled_district_judge"
  | "cancelled_court"
  | "cancelled_unknown";

type SegmentConfig = {
  key: ChartSegment;
  label: string;
  colour: string;
  stackOrder: number;
};

const SEGMENTS: SegmentConfig[] = [
  { key: "completed", label: "Completed", colour: "#00703c", stackOrder: 0 },
  { key: "vacated_magistrate", label: "Vacated by magistrate", colour: "#f47738", stackOrder: 1 },
  { key: "vacated_hmcts", label: "Vacated by HMCTS", colour: "#28a197", stackOrder: 2 },
  { key: "vacated_district_judge", label: "Vacated by DJ", colour: "#d4351c", stackOrder: 3 },
  { key: "vacated_court", label: "Vacated by court", colour: "#505a5f", stackOrder: 4 },
  { key: "vacated_unknown", label: "Vacated", colour: "#ffdd00", stackOrder: 5 },
  { key: "cancelled_magistrate", label: "Cancelled by magistrate", colour: "#ea6a2f", stackOrder: 6 },
  { key: "cancelled_hmcts", label: "Cancelled by HMCTS", colour: "#1d9e8f", stackOrder: 7 },
  { key: "cancelled_district_judge", label: "Cancelled by DJ", colour: "#942514", stackOrder: 8 },
  { key: "cancelled_court", label: "Cancelled by court", colour: "#383f43", stackOrder: 9 },
  { key: "cancelled_unknown", label: "Cancelled", colour: "#d4351c", stackOrder: 10 },
];

const SEGMENT_BY_KEY = Object.fromEntries(SEGMENTS.map((segment) => [segment.key, segment])) as Record<
  ChartSegment,
  SegmentConfig
>;

function sittingChartSegment(sitting: Pick<Sitting, "status" | "cancellation_category">): ChartSegment {
  if (sitting.status === "completed") return "completed";

  const category = isCancellationCategory(sitting.cancellation_category)
    ? sitting.cancellation_category
    : "unknown";

  return `${sitting.status}_${category}` as ChartSegment;
}

function monthKey(sessionDate: string): string {
  return sessionDate.slice(0, 7);
}

function monthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatSummary(counts: Record<ChartSegment, number>, periodLabel: string): string {
  const parts: string[] = [];

  const completed = counts.completed;
  if (completed > 0) {
    parts.push(`${completed} completed`);
  }

  for (const segment of SEGMENTS) {
    if (segment.key === "completed") continue;
    const count = counts[segment.key];
    if (count <= 0) continue;
    parts.push(`${count} ${segment.label.toLowerCase()}`);
  }

  if (parts.length === 0) {
    return `No sittings in ${periodLabel}.`;
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const summary = parts.join(", ");
  return `${summary} (${total} sittings in ${periodLabel}).`;
}

type SittingHistoryChartProps = {
  sittings: Sitting[];
  periodLabel: string;
};

export function SittingHistoryChart({ sittings, periodLabel }: SittingHistoryChartProps) {
  const chartData = useMemo(() => {
    const totals: Record<ChartSegment, number> = Object.fromEntries(
      SEGMENTS.map((segment) => [segment.key, 0])
    ) as Record<ChartSegment, number>;

    const byMonth = new Map<string, Record<ChartSegment, number>>();

    for (const sitting of sittings) {
      const segment = sittingChartSegment(sitting);
      totals[segment] += 1;

      const month = monthKey(sitting.session_date);
      if (!byMonth.has(month)) {
        byMonth.set(
          month,
          Object.fromEntries(SEGMENTS.map((s) => [s.key, 0])) as Record<ChartSegment, number>
        );
      }
      byMonth.get(month)![segment] += 1;
    }

    const months = [...byMonth.keys()].sort();
    const monthRows = months.map((month) => ({
      month,
      label: monthLabel(month),
      counts: byMonth.get(month)!,
      total: SEGMENTS.reduce((sum, segment) => sum + byMonth.get(month)![segment.key], 0),
    }));

    const maxTotal = monthRows.reduce((max, row) => Math.max(max, row.total), 0);

    return { totals, monthRows, maxTotal };
  }, [sittings]);

  const summaryText = formatSummary(chartData.totals, periodLabel);
  const activeLegend = SEGMENTS.filter((segment) => chartData.totals[segment.key] > 0);

  const chartWidth = 640;
  const chartHeight = 220;
  const marginLeft = 36;
  const marginRight = 8;
  const marginTop = 8;
  const marginBottom = 36;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;
  const barGap = 8;
  const barWidth =
    chartData.monthRows.length > 0
      ? (plotWidth - barGap * (chartData.monthRows.length - 1)) / chartData.monthRows.length
      : 0;

  return (
    <DashboardSection
      title="Sitting history"
      headingLevel={3}
      description={`Monthly sittings by outcome for ${periodLabel}.`}
      className="orion-sitting-history-chart"
    >
      <p className="govuk-visually-hidden" id="sitting-history-summary">
        {summaryText}
      </p>

      {sittings.length === 0 ? (
        <p className="govuk-body">No sittings recorded for this period.</p>
      ) : (
        <>
          <figure aria-labelledby="sitting-history-summary" role="img">
            <svg
              className="orion-sitting-history-chart__svg"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const value = Math.round(chartData.maxTotal * (1 - fraction));
                const y = marginTop + plotHeight * fraction;
                return (
                  <g key={fraction}>
                    <line
                      x1={marginLeft}
                      y1={y}
                      x2={chartWidth - marginRight}
                      y2={y}
                      stroke="#b1b4b6"
                      strokeWidth={1}
                    />
                    <text
                      x={marginLeft - 6}
                      y={y + 4}
                      textAnchor="end"
                      className="orion-sitting-history-chart__axis-label"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {chartData.monthRows.map((row, index) => {
                const x = marginLeft + index * (barWidth + barGap);
                let yOffset = marginTop + plotHeight;

                return (
                  <g key={row.month}>
                    {SEGMENTS.map((segment) => {
                      const count = row.counts[segment.key];
                      if (count <= 0) return null;

                      const barHeight =
                        chartData.maxTotal > 0 ? (count / chartData.maxTotal) * plotHeight : 0;
                      yOffset -= barHeight;

                      return (
                        <rect
                          key={segment.key}
                          x={x}
                          y={yOffset}
                          width={barWidth}
                          height={barHeight}
                          fill={segment.colour}
                          className="orion-sitting-history-chart__bar"
                        >
                          <title>{`${row.label}: ${count} ${segment.label}`}</title>
                        </rect>
                      );
                    })}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className="orion-sitting-history-chart__axis-label"
                    >
                      {row.label}
                    </text>
                  </g>
                );
              })}

              <text
                x={marginLeft + plotWidth / 2}
                y={chartHeight - 2}
                textAnchor="middle"
                className="orion-sitting-history-chart__axis-title"
              >
                Month
              </text>
              <text
                transform={`translate(12 ${marginTop + plotHeight / 2}) rotate(-90)`}
                textAnchor="middle"
                className="orion-sitting-history-chart__axis-title"
              >
                Sittings
              </text>
            </svg>
            <figcaption className="govuk-body-s govuk-!-margin-top-2">{summaryText}</figcaption>
          </figure>

          <ul className="orion-sitting-history-chart__legend govuk-list">
            {activeLegend.map((segment) => (
              <li key={segment.key} className="orion-sitting-history-chart__legend-item">
                <span
                  className="orion-sitting-history-chart__swatch"
                  style={{ backgroundColor: segment.colour }}
                  aria-hidden="true"
                />
                <span>
                  {segment.label}{" "}
                  <span className="govuk-body-s">({chartData.totals[segment.key]})</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardSection>
  );
}

export { sittingChartSegment, SEGMENT_BY_KEY };
