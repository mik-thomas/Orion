export type PeriodMode = "all" | "fiscal_year";

export type PeriodFilterState = {
  mode: PeriodMode;
  fiscalYear: string | null;
  quarter: string | null;
};

export type PeriodFilterResponse = {
  mode: PeriodMode;
  fiscal_year: string | null;
  quarter: string | null;
  label: string;
  start_date: string | null;
  end_date: string | null;
};

export const QUARTER_OPTIONS = ["Q1", "Q2", "Q3", "Q4"] as const;

export function currentFiscalYearLabel(asOf = new Date()): string {
  const year = asOf.getMonth() >= 3 ? asOf.getFullYear() : asOf.getFullYear() - 1;
  const end = (year + 1) % 100;
  return `${year}-${String(end).padStart(2, "0")}`;
}

export function defaultPeriodFilter(fiscalYear?: string | null): PeriodFilterState {
  return {
    mode: "fiscal_year",
    fiscalYear: fiscalYear ?? currentFiscalYearLabel(),
    quarter: null,
  };
}

export function periodFilterFromResponse(period: PeriodFilterResponse): PeriodFilterState {
  if (period.mode === "all") {
    return { mode: "all", fiscalYear: null, quarter: null };
  }

  return {
    mode: "fiscal_year",
    fiscalYear: period.fiscal_year,
    quarter: period.quarter,
  };
}

export function periodFilterQuery(state: PeriodFilterState): string {
  if (state.mode === "all") {
    return "period=all";
  }

  const params = new URLSearchParams();
  if (state.fiscalYear) {
    params.set("fiscal_year", state.fiscalYear);
  }
  if (state.quarter) {
    params.set("quarter", state.quarter);
  }
  return params.toString();
}

export function periodFilterLabel(state: PeriodFilterState): string {
  if (state.mode === "all") {
    return "All time";
  }

  if (!state.fiscalYear) {
    return "Fiscal year";
  }

  if (!state.quarter) {
    return state.fiscalYear;
  }

  return `${state.fiscalYear} ${state.quarter}`;
}
