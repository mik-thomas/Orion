/** GDS-aligned chart colours — match SittingHistoryChart / cancellationCategory. */
export const CHART_COLOURS = {
  completed: "#00703c",
  vacated: "#f47738",
  cancelled: "#28a197",
  cancelledByDj: "#d4351c",
  atHome: "#00703c",
  away: "#1d70b8",
  barDefault: "#505a5f",
  grid: "#b1b4b6",
  axis: "#505a5f",
  axisTitle: "#0b0c0c",
} as const;

export type ChartSegment = {
  key: string;
  label: string;
  value: number;
  colour: string;
};

export function segmentTotal(segments: ChartSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.value, 0);
}

export function activeSegments(segments: ChartSegment[]): ChartSegment[] {
  return segments.filter((segment) => segment.value > 0);
}

export function visibleSegments(
  segments: ChartSegment[],
  isVisible: (key: string) => boolean
): ChartSegment[] {
  return segments.filter((segment) => isVisible(segment.key));
}

export function formatSegmentSummary(
  segments: ChartSegment[],
  context?: string,
  isVisible?: (key: string) => boolean
): string {
  const scoped = isVisible ? visibleSegments(segments, isVisible) : segments;
  const active = activeSegments(scoped);
  if (active.length === 0) {
    if (isVisible && segments.some((segment) => segment.value > 0)) {
      return context ? `No categories selected for ${context}.` : "No categories selected.";
    }
    return context ? `No data for ${context}.` : "No data recorded.";
  }

  const parts = active.map((segment) => `${segment.value} ${segment.label.toLowerCase()}`);
  const total = segmentTotal(scoped);
  const summary = parts.join(", ");
  const filteredNote = isVisible && visibleSegments(segments, isVisible).length < segments.length ? " (filtered)" : "";

  if (context) {
    return `${summary} (${total} total in ${context})${filteredNote}.`;
  }

  return `${summary} (${total} total)${filteredNote}.`;
}

export function barColourByIndex(index: number): string {
  const palette = ["#1d70b8", "#00703c", "#f47738", "#28a197", "#4c2c92", "#d4351c", "#505a5f"];
  return palette[index % palette.length];
}
