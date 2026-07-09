import type { ChartSegment } from "./chartUtils";

type ChartLegendProps = {
  segments: ChartSegment[];
  className?: string;
  isVisible?: (key: string) => boolean;
  onToggle?: (key: string) => void;
  onShowAll?: () => void;
  interactive?: boolean;
};

export function ChartLegend({
  segments,
  className,
  isVisible,
  onToggle,
  onShowAll,
  interactive = Boolean(onToggle),
}: ChartLegendProps) {
  if (segments.length === 0) return null;

  const filtered = interactive && isVisible ? segments.some((s) => !isVisible(s.key)) : false;

  return (
    <div className={["orion-chart__legend-wrap", className].filter(Boolean).join(" ")}>
      {filtered && onShowAll ? (
        <button type="button" className="orion-chart__legend-show-all govuk-link" onClick={onShowAll}>
          Show all
        </button>
      ) : null}
      <ul className="orion-chart__legend govuk-list" role="list">
        {segments.map((segment) => {
          const visible = !isVisible || isVisible(segment.key);
          const itemClass = [
            "orion-chart__legend-item",
            interactive ? "orion-chart__legend-item--interactive" : "",
            visible ? "" : "orion-chart__legend-item--hidden",
          ]
            .filter(Boolean)
            .join(" ");

          if (interactive && onToggle) {
            return (
              <li key={segment.key} className={itemClass}>
                <button
                  type="button"
                  className="orion-chart__legend-button"
                  onClick={() => onToggle(segment.key)}
                  aria-pressed={visible}
                  aria-label={`${visible ? "Hide" : "Show"} ${segment.label}`}
                >
                  <span
                    className="orion-chart__swatch"
                    style={{ backgroundColor: segment.colour }}
                    aria-hidden="true"
                  />
                  <span className="orion-chart__legend-label">
                    {segment.label}{" "}
                    <span className="govuk-body-s">({segment.value})</span>
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li key={segment.key} className={itemClass}>
              <span
                className="orion-chart__swatch"
                style={{ backgroundColor: segment.colour }}
                aria-hidden="true"
              />
              <span className="orion-chart__legend-label">
                {segment.label} <span className="govuk-body-s">({segment.value})</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
