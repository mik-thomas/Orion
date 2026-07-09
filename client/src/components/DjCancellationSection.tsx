import { useId, useMemo } from "react";
import type { DjCancellations } from "../types/domain";
import type { PeriodFilterState } from "../lib/periodFilter";
import { useTableSort } from "../lib/useTableSort";
import { DashboardSection } from "./DashboardSection";
import { DashboardDrillDownValue, DashboardStatPanel, dashboardStatValue } from "./DashboardStatPanel";
import { DrillDownLink } from "./DrillDownLink";
import { SortableTableHeader } from "./SortableTableHeader";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";

interface DjCancellationSectionProps {
  report: DjCancellations;
  heading?: string;
  periodFilter?: PeriodFilterState;
}

const djFilters = {
  status: "cancelled" as const,
  cancellation_category: "district_judge" as const,
};

type DjBreakdownRow = {
  key: string;
  label: string;
  value: number;
  filters: Parameters<typeof DrillDownLink>[0]["filters"];
};

function DjBreakdownPanel({
  title,
  rows,
  periodFilter,
}: {
  title: string;
  rows: DjBreakdownRow[];
  periodFilter?: PeriodFilterState;
}) {
  const summaryId = useId();
  const sortColumns = useMemo(
    () => ({
      label: { getValue: (row: DjBreakdownRow) => row.label },
      value: { getValue: (row: DjBreakdownRow) => row.value, type: "number" as const },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(rows, sortColumns, {
    key: "value",
    direction: "desc",
  });

  if (rows.length === 0) {
    return (
      <div className="orion-dashboard-subsection">
        <h3 className="govuk-heading-s orion-dashboard-subsection__title">{title}</h3>
        <p className="govuk-body">None recorded.</p>
      </div>
    );
  }

  return (
    <div className="orion-dashboard-subsection">
      <h3 className="govuk-heading-s orion-dashboard-subsection__title">{title}</h3>
      <ChartTableToggle
        tableCaption={title}
        hasData={rows.length > 0}
        chart={
          <HorizontalBarChart
            rows={rows.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.value,
              colour: "#d4351c",
            }))}
            emptyMessage="None recorded."
            summaryContext={title.toLowerCase()}
            summaryId={summaryId}
          />
        }
        table={
          <>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="label" sort={sort} onSort={toggleSort}>
                  {title === "By court room" ? "Location" : title.replace("By ", "")}
                </SortableTableHeader>
                <SortableTableHeader columnKey="value" sort={sort} onSort={toggleSort}>
                  Cancelled
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedData.map((row) => (
                <tr key={row.key} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    {periodFilter ? (
                      <DrillDownLink
                        filters={row.filters}
                        period={periodFilter}
                        ariaLabel={`View DJ cancellations for ${row.label}`}
                      >
                        {row.label}
                      </DrillDownLink>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="govuk-table__cell">
                    {periodFilter && row.value > 0 ? (
                      <DrillDownLink
                        filters={row.filters}
                        period={periodFilter}
                        ariaLabel={`View ${row.value} DJ cancellations for ${row.label}`}
                      >
                        <strong className="govuk-tag govuk-tag--red">{row.value}</strong>
                      </DrillDownLink>
                    ) : row.value > 0 ? (
                      <strong className="govuk-tag govuk-tag--red">{row.value}</strong>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </>
        }
      />
    </div>
  );
}

export function DjCancellationSection({
  report,
  heading = "District Judge cancellations",
  periodFilter,
}: DjCancellationSectionProps) {
  const courthouseRows: DjBreakdownRow[] = report.by_courthouse.map((row) => ({
    key: row.courthouse,
    label: row.courthouse,
    value: row.sittings,
    filters: { ...djFilters, courthouse: row.courthouse },
  }));

  const sittingTypeRows: DjBreakdownRow[] = report.by_sitting_type.map((row) => ({
    key: row.sitting_type,
    label: row.sitting_type,
    value: row.sittings,
    filters: { ...djFilters, sitting_type: row.sitting_type },
  }));

  const courtRoomRows: DjBreakdownRow[] = report.by_court_room.map((row) => ({
    key: `${row.courthouse}-${row.court_room}`,
    label: `${row.courthouse} — ${row.court_room}`,
    value: row.sittings,
    filters: { ...djFilters, courthouse: row.courthouse, court_room: row.court_room },
  }));

  return (
    <DashboardSection
      title={heading}
      tag={`${report.total} total`}
      tagColour="red"
      description="Sittings cancelled because a District Judge took the bench."
    >
      <DashboardStatPanel
        cols={1}
        items={[
          {
            label: "Total cancellations",
            tone: "red",
            value: periodFilter ? (
              <DashboardDrillDownValue
                count={report.total}
                filters={djFilters}
                period={periodFilter}
                ariaLabel={`View all ${report.total} sittings cancelled by District Judge`}
              />
            ) : (
              dashboardStatValue(report.total)
            ),
          },
        ]}
      />

      <div className="govuk-grid-row">
        <div className="govuk-grid-column-one-third">
          <DjBreakdownPanel title="By location" rows={courthouseRows} periodFilter={periodFilter} />
        </div>
        <div className="govuk-grid-column-one-third">
          <DjBreakdownPanel title="By sitting bench" rows={sittingTypeRows} periodFilter={periodFilter} />
        </div>
        <div className="govuk-grid-column-one-third">
          <DjBreakdownPanel title="By court room" rows={courtRoomRows} periodFilter={periodFilter} />
        </div>
      </div>
    </DashboardSection>
  );
}
