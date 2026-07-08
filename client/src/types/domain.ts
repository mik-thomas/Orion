export interface Courthouse {
  id: number;
  name: string;
  borough: string | null;
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
}

export interface MagistrateDetail extends MagistrateSummary {
  sitting_locations: Courthouse[];
  leaves_of_absence: LeaveOfAbsence[];
  cases: CaseSummary[];
}

export interface ReportsOverview {
  summary: {
    magistrates: number;
    courthouses: number;
    sittings: number;
    vacated_sittings: number;
    sitting_types: number;
  };
  by_courthouse: Array<{ courthouse: string; sittings: number }>;
  away_from_home: Array<{ magistrate: string; away_sittings: number }>;
  by_sitting_type: Array<{ sitting_type: string; sittings: number }>;
  note: string;
}
