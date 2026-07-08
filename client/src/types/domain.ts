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
  severity: "red";
  message: string;
  actual: number | null;
  required: number | null;
  year: number | null;
}

export interface MagistrateSummary {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
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
}

export interface Sitting {
  id: number;
  magistrate_id: number;
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
}

export interface MagistrateDetail extends MagistrateSummary {
  sitting_locations: Courthouse[];
  leaves_of_absence: LeaveOfAbsence[];
  cases: CaseSummary[];
  sitting_summary: SittingSummary;
  sittings: Sitting[];
}

export interface ReportsOverview {
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
  dj_cancellations: DjCancellations;
  login_report: Array<{
    magistrate_id: number;
    magistrate: string;
    last_login_on: string;
    days_since_login: number | null;
  }>;
  note: string;
}
