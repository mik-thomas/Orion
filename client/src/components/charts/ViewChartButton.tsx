import { useState, type ReactNode } from "react";
import { ChartModal } from "./ChartModal";

type ViewChartButtonProps = {
  title: string;
  chart: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function ViewChartButton({ title, chart, disabled = false, className }: ViewChartButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={["govuk-button govuk-button--secondary govuk-!-margin-bottom-3", className]
          .filter(Boolean)
          .join(" ")}
        data-module="govuk-button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <span className="orion-view-chart-button__icon" aria-hidden="true">
          ▥
        </span>{" "}
        View chart
      </button>
      <ChartModal title={title} open={open} onClose={() => setOpen(false)}>
        {chart}
      </ChartModal>
    </>
  );
}
