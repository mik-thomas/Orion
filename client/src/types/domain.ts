export interface Courthouse {
  id: number;
  name: string;
  cluster: string;
  bench: string;
  code: string | null;
}

export interface SittingType {
  id: number;
  name: string;
  code: string | null;
}

export interface LeaveOfAbsence {
  id: number;
  magistrate_id: number;
  starts_on: string;
  ends_on: string | null;
  reason: string | null;
  notes: string | null;
  next_loa_review_on: string | null;
  active: boolean;
}

export interface CaseSummary {
  id: number;
  magistrate_id: number;
  reference: string | null;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
}

export interface Note {
  id: number;
  case_id: number;
  body: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseDetail extends CaseSummary {
  notes: Note[];
}

export interface ComplianceViolation {
  code: string;
  severity: "red" | "yellow";
  message: string;
  actual: number | null;
  required: number | null;
  year: string | null;
}

export interface SittingCommitment {
  fiscal_year_label: string;
  full_days_completed: number;
  full_days_required: number;
  half_days_completed: number;
  half_days_required: number;
  prorated_half_days_required: number;
  on_track: boolean;
  multi_court: boolean;
}

export type Role = "HMCTS-SLM" | "Developer" | "Bench Chair" | "Deputy";

export interface MagistrateSummary {
  id: number;
  reference_code: string;
  display_name: string;
  name_visible: boolean;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  date_of_appointment: string | null;
  reasonable_adjustments: string | null;
  home_courthouse: Courthouse | null;
  active_leave: boolean;
  current_leaves: LeaveOfAbsence[];
  cluster: string;
  bench: string;
  bench_role: string | null;
  appraisal_status: string | null;
  appraisal_cycle_years: number | null;
  presiding_justice: boolean;
  last_appraisal_on: string | null;
  last_appraiser: string | null;
  last_login_on: string | null;
  days_since_login: number | null;
  violations: ComplianceViolation[];
  has_violations: boolean;
  sitting_commitment: SittingCommitment | null;
}

export interface Sitting {
  id: number;
  magistrate_id: number;
  magistrate_name?: string;
  courthouse_id: number;
  sitting_type_id: number;
  session_date: string;
  session: string | null;
  status: "completed" | "vacated" | "cancelled";
  court_type: string | null;
  sitting_position: string | null;
  court_room: string | null;
  business_type: string | null;
  cancellation_category: string | null;
  away_from_home_court: boolean;
  courthouse: Courthouse;
  sitting_type: SittingType;
}

export interface SittingDrillDownRow {
  id: number;
  magistrate_id: number;
  session_date: string;
  session: string | null;
  display_name: string;
  courthouse: string;
  court_room: string | null;
  court_type: string | null;
  sitting_type: string;
  sitting_position: string | null;
  status: "completed" | "vacated" | "cancelled";
  cancellation_category: string | null;
  away_from_home: boolean;
}

export interface SittingsDrillDownResponse {
  period: PeriodFilterContext;
  available_fiscal_years: string[];
  filters: Partial<SittingsDrillDownFilters>;
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
  sittings: SittingDrillDownRow[];
}

export type SittingsDrillDownFilters = {
  status?: "completed" | "vacated" | "cancelled";
  cancellation_category?: "district_judge";
  courthouse?: string;
  courthouse_id?: number;
  court_type?: string;
  court_room?: string;
  sitting_type?: string;
  sitting_type_id?: number;
  magistrate_id?: number;
  away_from_home?: boolean;
  page?: number;
  per_page?: number;
};

export interface CourtRoomRow {
  courthouse: string;
  court_room: string;
  sittings: number;
  completed: number;
  vacated: number;
  cancelled: number;
  cancelled_by_dj: number;
}

export interface DjCancellations {
  total: number;
  by_courthouse: Array<{ courthouse: string; sittings: number }>;
  by_sitting_type: Array<{ sitting_type: string; sittings: number }>;
  by_court_room: CourtRoomRow[];
}

export interface SittingSummary {
  totals: {
    completed: number;
    vacated: number;
    cancelled: number;
    cancelled_by_dj: number;
  };
  by_location: Array<{ courthouse: string; sittings: number }>;
  by_court_type: Array<{ court_type: string; sittings: number }>;
  by_sitting_type: Array<{ sitting_type: string; sittings: number }>;
  by_court_room: CourtRoomRow[];
  dj_cancellations: DjCancellations;
  home_away: {
    at_home: number;
    away: number;
    total_completed: number;
    away_pct: number;
  } | null;
}

export interface HomeCourtMovementReport {
  summary: {
    total_completed_sittings: number;
    completed_at_home: number;
    completed_away: number;
    away_pct: number;
    magistrates_with_home_court: number;
    magistrates_missing_home_court: number;
  };
  courthouses: string[];
  by_home_court: Array<{
    home_courthouse: string;
    magistrates: number;
    completed_at_home: number;
    completed_away: number;
    completed_total: number;
    away_pct: number;
  }>;
  matrix: Array<{
    home_courthouse: string;
    at_home: number;
    away: number;
    total: number;
    cells: Record<string, number>;
  }>;
  flags: {
    zero_completed_sittings: Array<{
      magistrate_id: number;
      magistrate: string;
      home_courthouse: string;
    }>;
    sheffield_at_barnsley: Array<{
      magistrate_id: number;
      magistrate: string;
      barnsley_sittings: number;
      total_completed: number;
      barnsley_pct: number;
    }>;
  };
}

export interface MagistrateDetail extends MagistrateSummary {
  period?: PeriodFilterContext;
  available_fiscal_years?: string[];
  sitting_locations: Courthouse[];
  leaves_of_absence: LeaveOfAbsence[];
  cases: CaseSummary[];
  sitting_summary: SittingSummary;
  sittings: Sitting[];
}

export interface FiscalYearContext {
  label: string;
  quarter: number | null;
  start_date: string;
  end_date: string;
}

export interface PeriodFilterContext {
  mode: "all" | "fiscal_year";
  fiscal_year: string | null;
  quarter: string | null;
  label: string;
  start_date: string | null;
  end_date: string | null;
}

export interface ReportsOverview {
  period: PeriodFilterContext;
  available_fiscal_years: string[];
  fiscal_year?: FiscalYearContext | null;
  summary: {
    magistrates: number;
    active_magistrates: number;
    courthouses: number;
    sittings: number;
    completed_sittings: number;
    vacated_sittings: number;
    cancelled_sittings: number;
    cancelled_by_dj: number;
    sitting_types: number;
  };
  by_courthouse: Array<{ courthouse: string; sittings: number }>;
  by_court_type: Array<{ court_type: string; sittings: number }>;
  by_court_room: CourtRoomRow[];
  away_from_home: Array<{ magistrate_id: number; magistrate: string; away_sittings: number }>;
  by_sitting_type: Array<{ sitting_type: string; sittings: number }>;
  dj_cancellations?: DjCancellations;
  home_court_movement?: HomeCourtMovementReport;
  login_report: Array<{
    magistrate_id: number;
    magistrate: string;
    last_login_on: string;
    days_since_login: number | null;
  }>;
  note: string;
}

export interface MagistrateRosterEntry {
  id: number;
  reference_code: string;
  full_name: string;
  home_courthouse: string | null;
  email: string | null;
}
