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
  cluster: string;
  bench: string;
  bench_role: string | null;
  appraisal_status: string | null;
  appraisal_cycle_years: number | null;
  presiding_justice: boolean;
  last_appraisal_on: string | null;
  last_appraiser: string | null;
  violations: ComplianceViolation[];
  has_violations: boolean;
}

export interface MagistrateDetail extends MagistrateSummary {
  sitting_locations: Courthouse[];
  leaves_of_absence: LeaveOfAbsence[];
  cases: CaseSummary[];
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
    sitting_types: number;
  };
  by_courthouse: Array<{ courthouse: string; sittings: number }>;
  by_court_type: Array<{ court_type: string; sittings: number }>;
  away_from_home: Array<{ magistrate: string; away_sittings: number }>;
  by_sitting_type: Array<{ sitting_type: string; sittings: number }>;
  note: string;
}
