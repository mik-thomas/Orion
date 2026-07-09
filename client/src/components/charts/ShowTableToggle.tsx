import { type ReactNode } from "react";
import { ChartTableToggle } from "./ChartTableToggle";

type ShowTableToggleProps = {
  children: ReactNode;
  table: ReactNode;
  tableCaption: string;
  hasData?: boolean;
};

/** Chart-first view with Chart | Table | Both selector (default Chart). */
export function ShowTableToggle({
  children,
  table,
  tableCaption,
  hasData = true,
}: ShowTableToggleProps) {
  return (
    <ChartTableToggle
      chart={children}
      table={table}
      tableCaption={tableCaption}
      hasData={hasData}
      defaultMode="chart"
    />
  );
}
