import type { ChartSegment } from "./chartUtils";

type ChartLegendProps = {
  segments: ChartSegment[];
  className?: string;
};

export function ChartLegend({ segments, className }: ChartLegendProps) {
  if (segments.length === 0) return null;

  return (
    <ul className={["orion-chart__legend govuk-list", className].filter(Boolean).join(" ")}>
      {segments.map((segment) => (
        <li key={segment.key} className="orion-chart__legend-item">
          <span
            className="orion-chart__swatch"
            style={{ backgroundColor: segment.colour }}
            aria-hidden="true"
          />
          <span>
            {segment.label} <span className="govuk-body-s">({segment.value})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
