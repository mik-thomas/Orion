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

export function currentFiscalQuarterNumber(asOf = new Date()): number {
  const month = asOf.getMonth() + 1;
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

export function lastCompletedFiscalQuarter(asOf = new Date()): { fiscalYear: string; quarter: string } {
  const currentQuarter = currentFiscalQuarterNumber(asOf);

  if (currentQuarter === 1) {
    const prevFyStart = asOf.getMonth() >= 3 ? asOf.getFullYear() - 1 : asOf.getFullYear() - 2;
    const end = (prevFyStart + 1) % 100;
    return {
      fiscalYear: `${prevFyStart}-${String(end).padStart(2, "0")}`,
      quarter: "Q4",
    };
  }

  const fyStart = asOf.getMonth() >= 3 ? asOf.getFullYear() : asOf.getFullYear() - 1;
  const end = (fyStart + 1) % 100;
  return {
    fiscalYear: `${fyStart}-${String(end).padStart(2, "0")}`,
    quarter: `Q${currentQuarter - 1}`,
  };
}

export function defaultPeriodFilter(fiscalYear?: string | null): PeriodFilterState {
  return {
    mode: "fiscal_year",
    fiscalYear: fiscalYear ?? currentFiscalYearLabel(),
    quarter: null,
  };
}

export function defaultProfilePeriodFilter(asOf = new Date()): PeriodFilterState {
  const { fiscalYear, quarter } = lastCompletedFiscalQuarter(asOf);
  return {
    mode: "fiscal_year",
    fiscalYear,
    quarter,
  };
}

export function parsePeriodFilterSearch(
  search: string,
  fallback: PeriodFilterState = defaultPeriodFilter()
): PeriodFilterState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (params.get("period") === "all") {
    return { mode: "all", fiscalYear: null, quarter: null };
  }

  if (params.has("period") || params.has("fiscal_year") || params.has("quarter") || params.has("year")) {
    return {
      mode: "fiscal_year",
      fiscalYear: params.get("fiscal_year") ?? params.get("year"),
      quarter: params.get("quarter"),
    };
  }

  return fallback;
}

export function magistrateProfilePath(
  id: number,
  period: PeriodFilterState = defaultProfilePeriodFilter()
): string {
  const query = periodFilterQuery(period);
  return `/magistrates/${id}${query ? `?${query}` : ""}`;
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
