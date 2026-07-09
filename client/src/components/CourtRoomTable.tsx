import { useId, useMemo } from "react";
import type { CourtRoomRow } from "../types/domain";
import type { PeriodFilterState } from "../lib/periodFilter";
import { useTableSort } from "../lib/useTableSort";
import { DrillDownLink } from "./DrillDownLink";
import { SortableTableHeader } from "./SortableTableHeader";
import { ChartTableToggle } from "./charts/ChartTableToggle";
import { StackedBarChart, courtRoomStackRow } from "./charts/StackedBarChart";

interface CourtRoomTableProps {
  rows: CourtRoomRow[];
  heading?: string;
  emptyMessage?: string;
  periodFilter?: PeriodFilterState;
  embedded?: boolean;
}

function CountLink({
  count,
  filters,
  periodFilter,
  label,
}: {
  count: number;
  filters: Parameters<typeof DrillDownLink>[0]["filters"];
  periodFilter?: PeriodFilterState;
  label: string;
}) {
  if (!periodFilter || count === 0) {
    return <>{count}</>;
  }

  return (
    <DrillDownLink filters={filters} period={periodFilter} ariaLabel={label}>
      {count}
    </DrillDownLink>
  );
}

export function CourtRoomTable({
  rows,
  heading = "Sittings by court room",
  emptyMessage = "No court room data recorded.",
  periodFilter,
  embedded = false,
}: CourtRoomTableProps) {
  const summaryId = useId();
  const sortColumns = useMemo(
    () => ({
      courthouse: { getValue: (row: CourtRoomRow) => row.courthouse },
      court_room: { getValue: (row: CourtRoomRow) => row.court_room },
      sittings: { getValue: (row: CourtRoomRow) => row.sittings, type: "number" as const },
      completed: { getValue: (row: CourtRoomRow) => row.completed, type: "number" as const },
      vacated: { getValue: (row: CourtRoomRow) => row.vacated, type: "number" as const },
      cancelled: { getValue: (row: CourtRoomRow) => row.cancelled, type: "number" as const },
      cancelled_by_dj: { getValue: (row: CourtRoomRow) => row.cancelled_by_dj, type: "number" as const },
    }),
    []
  );
  const { sort, toggleSort, sortedData } = useTableSort(rows, sortColumns, {
    key: "sittings",
    direction: "desc",
  });

  const content =
    rows.length === 0 ? (
      <p className="govuk-body">{emptyMessage}</p>
    ) : (
      <ChartTableToggle
        tableCaption={heading}
        hasData={rows.length > 0}
        chart={
          <StackedBarChart
            rows={rows.map((row) =>
              courtRoomStackRow(row.courthouse, row.court_room, {
                completed: row.completed,
                vacated: row.vacated,
                cancelled: row.cancelled,
              })
            )}
            emptyMessage={emptyMessage}
            summaryContext="court rooms"
            summaryId={summaryId}
          />
        }
        table={
          <>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <SortableTableHeader columnKey="courthouse" sort={sort} onSort={toggleSort}>
                  Courthouse
                </SortableTableHeader>
                <SortableTableHeader columnKey="court_room" sort={sort} onSort={toggleSort}>
                  Court room
                </SortableTableHeader>
                <SortableTableHeader columnKey="sittings" sort={sort} onSort={toggleSort}>
                  Total
                </SortableTableHeader>
                <SortableTableHeader columnKey="completed" sort={sort} onSort={toggleSort}>
                  Completed
                </SortableTableHeader>
                <SortableTableHeader columnKey="vacated" sort={sort} onSort={toggleSort}>
                  Vacated
                </SortableTableHeader>
                <SortableTableHeader columnKey="cancelled" sort={sort} onSort={toggleSort}>
                  Cancelled
                </SortableTableHeader>
                <SortableTableHeader columnKey="cancelled_by_dj" sort={sort} onSort={toggleSort}>
                  Cancelled by DJ
                </SortableTableHeader>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {sortedData.map((row) => {
                const base = { courthouse: row.courthouse, court_room: row.court_room };
                return (
                  <tr key={`${row.courthouse}-${row.court_room}`} className="govuk-table__row">
                    <td className="govuk-table__cell">
                      {periodFilter ? (
                        <DrillDownLink
                          filters={{ courthouse: row.courthouse }}
                          period={periodFilter}
                          ariaLabel={`View sittings at ${row.courthouse}`}
                        >
                          {row.courthouse}
                        </DrillDownLink>
                      ) : (
                        row.courthouse
                      )}
                    </td>
                    <td className="govuk-table__cell">
                      {periodFilter ? (
                        <DrillDownLink
                          filters={base}
                          period={periodFilter}
                          ariaLabel={`View sittings in ${row.court_room} at ${row.courthouse}`}
                        >
                          {row.court_room}
                        </DrillDownLink>
                      ) : (
                        row.court_room
                      )}
                    </td>
                    <td className="govuk-table__cell">
                      <CountLink
                        count={row.sittings}
                        filters={base}
                        periodFilter={periodFilter}
                        label={`View ${row.sittings} sittings in ${row.court_room} at ${row.courthouse}`}
                      />
                    </td>
                    <td className="govuk-table__cell">
                      <CountLink
                        count={row.completed}
                        filters={{ ...base, status: "completed" }}
                        periodFilter={periodFilter}
                        label={`View ${row.completed} completed sittings in ${row.court_room} at ${row.courthouse}`}
                      />
                    </td>
                    <td className="govuk-table__cell">
                      <CountLink
                        count={row.vacated}
                        filters={{ ...base, status: "vacated" }}
                        periodFilter={periodFilter}
                        label={`View ${row.vacated} vacated sittings in ${row.court_room} at ${row.courthouse}`}
                      />
                    </td>
                    <td className="govuk-table__cell">
                      <CountLink
                        count={row.cancelled}
                        filters={{ ...base, status: "cancelled" }}
                        periodFilter={periodFilter}
                        label={`View ${row.cancelled} cancelled sittings in ${row.court_room} at ${row.courthouse}`}
                      />
                    </td>
                    <td className="govuk-table__cell">
                      {row.cancelled_by_dj > 0 && periodFilter ? (
                        <DrillDownLink
                          filters={{
                            ...base,
                            status: "cancelled",
                            cancellation_category: "district_judge",
                          }}
                          period={periodFilter}
                          ariaLabel={`View ${row.cancelled_by_dj} sittings cancelled by DJ in ${row.court_room} at ${row.courthouse}`}
                        >
                          <strong className="govuk-tag govuk-tag--red">{row.cancelled_by_dj}</strong>
                        </DrillDownLink>
                      ) : row.cancelled_by_dj > 0 ? (
                        <strong className="govuk-tag govuk-tag--red">{row.cancelled_by_dj}</strong>
                      ) : (
                        row.cancelled_by_dj
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </>
        }
      />
    );

  if (embedded) {
    return (
      <div className="orion-dashboard-subsection">
        <h3 className="govuk-heading-s orion-dashboard-subsection__title">{heading}</h3>
        {content}
      </div>
    );
  }

  return (
    <section className="orion-dashboard-section">
      <h3 className="govuk-heading-m orion-dashboard-section__title">{heading}</h3>
      {content}
    </section>
  );
}
