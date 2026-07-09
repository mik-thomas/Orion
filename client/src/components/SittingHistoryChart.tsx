import { useMemo } from "react";
import { ChartLegend } from "./charts/ChartLegend";
import { ViewChartButton } from "./charts/ViewChartButton";
import { type ChartSegment as SharedChartSegment } from "./charts/chartUtils";
import { useChartFilter } from "./charts/useChartFilter";
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

function formatSummary(
  counts: Record<ChartSegment, number>,
  periodLabel: string,
  isVisible: (key: string) => boolean
): string {
  const parts: string[] = [];

  for (const segment of SEGMENTS) {
    if (!isVisible(segment.key)) continue;
    const count = counts[segment.key];
    if (count <= 0) continue;
    parts.push(`${count} ${segment.label.toLowerCase()}`);
  }

  if (parts.length === 0) {
    const hasData = SEGMENTS.some((segment) => counts[segment.key] > 0);
    if (hasData) {
      return `No categories selected for ${periodLabel}.`;
    }
    return `No sittings in ${periodLabel}.`;
  }

  const total = SEGMENTS.reduce(
    (sum, segment) => (isVisible(segment.key) ? sum + counts[segment.key] : sum),
    0
  );
  const filteredNote = SEGMENTS.some((segment) => !isVisible(segment.key)) ? " (filtered)" : "";
  const summary = parts.join(", ");
  return `${summary} (${total} sittings in ${periodLabel})${filteredNote}.`;
}

function buildChartData(sittings: Sitting[]) {
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
}

type SittingHistoryChartProps = {
  sittings: Sitting[];
  periodLabel: string;
};

function SittingHistoryChartVisual({
  periodLabel,
  chartData,
}: Omit<SittingHistoryChartProps, "sittings"> & { chartData: ReturnType<typeof buildChartData> }) {
  const legendSegments: SharedChartSegment[] = useMemo(
    () =>
      SEGMENTS.filter((segment) => chartData.totals[segment.key] > 0).map((segment) => ({
        key: segment.key,
        label: segment.label,
        value: chartData.totals[segment.key],
        colour: segment.colour,
      })),
    [chartData.totals]
  );

  const filterKeys = useMemo(() => legendSegments.map((segment) => segment.key), [legendSegments]);
  const { toggle, showAll, isVisible } = useChartFilter(filterKeys);

  const visibleMaxTotal = useMemo(() => {
    return chartData.monthRows.reduce((max, row) => {
      const rowTotal = SEGMENTS.reduce(
        (sum, segment) => (isVisible(segment.key) ? sum + row.counts[segment.key] : sum),
        0
      );
      return Math.max(max, rowTotal);
    }, 0);
  }, [chartData.monthRows, isVisible]);

  const summaryText = formatSummary(chartData.totals, periodLabel, isVisible);

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
    <>
      <p className="govuk-visually-hidden" id="sitting-history-summary">
        {summaryText}
      </p>

      <figure aria-labelledby="sitting-history-summary" role="img">
        <svg
          className="orion-sitting-history-chart__svg"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const value = Math.round(visibleMaxTotal * (1 - fraction));
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

          {chartData.monthRows.map((row, monthIndex) => {
            const x = marginLeft + monthIndex * (barWidth + barGap);
            let yOffset = marginTop + plotHeight;

            return (
              <g key={row.month}>
                {SEGMENTS.map((segment, segmentIndex) => {
                  const count = row.counts[segment.key];
                  const segmentVisible = isVisible(segment.key);
                  if (count <= 0) return null;

                  const barHeight =
                    segmentVisible && visibleMaxTotal > 0
                      ? (count / visibleMaxTotal) * plotHeight
                      : 0;
                  yOffset -= barHeight;

                  return (
                    <rect
                      key={segment.key}
                      x={x}
                      y={yOffset}
                      width={barWidth}
                      height={barHeight}
                      fill={segment.colour}
                      className={[
                        "orion-sitting-history-chart__bar",
                        "orion-chart__bar--vertical",
                        segmentVisible ? "orion-sitting-history-chart__bar--enter" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        animationDelay: `${monthIndex * 35 + segmentIndex * 20}ms`,
                        opacity: segmentVisible ? 1 : 0,
                      }}
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

export function SittingHistoryChart({ sittings, periodLabel }: SittingHistoryChartProps) {
  const chartData = useMemo(() => buildChartData(sittings), [sittings]);

  return (
    <DashboardSection
      title="Sitting history"
      headingLevel={3}
      description={`Monthly sittings by outcome for ${periodLabel}.`}
      className="orion-sitting-history-chart"
    >
      {sittings.length === 0 ? (
        <p className="govuk-body">No sittings recorded for this period.</p>
      ) : (
        <>
          <ViewChartButton
            title="Sitting history"
            chart={<SittingHistoryChartVisual periodLabel={periodLabel} chartData={chartData} />}
          />
          <table className="govuk-table">
            <caption className="govuk-table__caption govuk-table__caption--m">Sitting history by month</caption>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Month
                </th>
                <th scope="col" className="govuk-table__header">
                  Sittings
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {chartData.monthRows.map((row) => (
                <tr key={row.month} className="govuk-table__row">
                  <td className="govuk-table__cell">{row.label}</td>
                  <td className="govuk-table__cell">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </DashboardSection>
  );
}

export { sittingChartSegment, SEGMENT_BY_KEY };
