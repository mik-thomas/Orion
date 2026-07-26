import { Link } from "react-router-dom";
import {
  CasebookAccordion,
  CasebookDl,
  CasebookSidebar,
} from "./casebook/CasebookChrome";
import { ContactNumberEditor } from "./ContactNumberEditor";
import { NextLoaReviewTag } from "../lib/loaReview";
import { isRetiringSoon } from "../lib/retirement";
import type { MagistrateDetail, MagistrateSummary } from "../types/domain";

type MagistrateLike = MagistrateSummary | MagistrateDetail;

function formatUkDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function MagistrateSidebar({
  magistrate,
  canViewNames = true,
  profileHref,
  onContactNumberUpdated,
}: {
  magistrate: MagistrateLike;
  canViewNames?: boolean;
  profileHref?: string;
  onContactNumberUpdated?: (contactNumber: string | null) => void;
}) {
  const title = `${magistrate.display_name}: ${magistrate.reference_code}`;
  const sittingLocations =
    "sitting_locations" in magistrate && Array.isArray(magistrate.sitting_locations)
      ? magistrate.sitting_locations
      : [];

  return (
    <CasebookSidebar title={title}>
      <CasebookAccordion title="Personal details" defaultOpen>
        <p className="csbk-sidebar__name">
          {canViewNames && magistrate.full_name ? magistrate.full_name : magistrate.display_name}
        </p>
        <CasebookDl
          rows={[
            { key: "Reference", value: magistrate.reference_code },
            { key: "Cluster / bench", value: `${magistrate.cluster} / ${magistrate.bench}` },
            {
              key: "Role",
              value: magistrate.presiding_justice ? "Presiding Justice" : "Winger",
            },
            {
              key: "Email address",
              value: magistrate.email?.trim() ? magistrate.email : "Not recorded",
            },
            {
              key: "Contact number",
              value: canViewNames ? (
                <ContactNumberEditor
                  magistrateId={magistrate.id}
                  contactNumber={magistrate.contact_number}
                  editable={Boolean(onContactNumberUpdated)}
                  onUpdated={(contactNumber) => onContactNumberUpdated?.(contactNumber)}
                />
              ) : (
                "Hidden"
              ),
            },
            {
              key: "Appointed",
              value: magistrate.date_of_appointment ?? "Not recorded",
            },
            {
              key: "Retirement",
              value: magistrate.retirement_on ? (
                isRetiringSoon(magistrate.retirement_on) ? (
                  <strong className="govuk-tag govuk-tag--yellow">{magistrate.retirement_on}</strong>
                ) : (
                  magistrate.retirement_on
                )
              ) : (
                "Not recorded"
              ),
            },
          ]}
        />
        {profileHref ? (
          <Link to={profileHref} className="csbk-sidebar__edit govuk-link">
            View full profile
          </Link>
        ) : null}
      </CasebookAccordion>

      <CasebookAccordion title="Home court & locations">
        <CasebookDl
          rows={[
            {
              key: "Home court",
              value: magistrate.home_courthouse?.name ?? "Not recorded",
            },
            {
              key: "Sitting locations",
              value:
                sittingLocations.length > 0
                  ? sittingLocations.map((court) => court.name).join(", ")
                  : "None recorded",
            },
          ]}
        />
      </CasebookAccordion>

      <CasebookAccordion title="Appraisal">
        <CasebookDl
          rows={[
            {
              key: "Status",
              value: magistrate.appraisal_status ?? "Not recorded",
            },
            {
              key: "Cycle",
              value: magistrate.appraisal_cycle_years
                ? `Every ${magistrate.appraisal_cycle_years} years`
                : "Not recorded",
            },
            {
              key: "Last appraisal",
              value: magistrate.last_appraisal_on ?? "Not recorded",
            },
            {
              key: "Last appraiser",
              value: magistrate.last_appraiser ?? "Not recorded",
            },
          ]}
        />
      </CasebookAccordion>

      <CasebookAccordion title="Leave of absence" defaultOpen={magistrate.active_leave}>
        {magistrate.current_leaves.length === 0 ? (
          <p className="govuk-body-s">No active leave.</p>
        ) : (
          <ul className="csbk-sidebar__list">
            {magistrate.current_leaves.map((leave) => (
              <li key={leave.id}>
                {leave.starts_on} to {leave.ends_on ?? "open-ended"}
                {leave.reason ? ` — ${leave.reason}` : ""}
                <br />
                Next review: <NextLoaReviewTag leave={leave} />
              </li>
            ))}
          </ul>
        )}
      </CasebookAccordion>

      <CasebookAccordion title="Compliance" defaultOpen={magistrate.has_violations}>
        {magistrate.has_violations ? (
          <ul className="csbk-sidebar__list">
            {magistrate.violations.map((violation) => (
              <li key={`${violation.code}-${violation.message}`}>
                <strong
                  className={`govuk-tag ${
                    violation.severity === "red" ? "govuk-tag--red" : "govuk-tag--yellow"
                  }`}
                >
                  {violation.severity}
                </strong>{" "}
                {violation.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="govuk-body-s">No compliance issues recorded.</p>
        )}
        {magistrate.sitting_commitment ? (
          <CasebookDl
            rows={[
              {
                key: "Year",
                value: magistrate.sitting_commitment.fiscal_year_label,
              },
              {
                key: "Full days",
                value: `${magistrate.sitting_commitment.full_days_completed} / ${magistrate.sitting_commitment.full_days_required}`,
              },
              {
                key: "On track",
                value: magistrate.sitting_commitment.on_track ? "Yes" : "No",
              },
            ]}
          />
        ) : null}
      </CasebookAccordion>

      <CasebookAccordion title="Support needs">
        <p className="govuk-body-s">
          {magistrate.reasonable_adjustments ?? "None recorded"}
        </p>
      </CasebookAccordion>

      <CasebookAccordion title="Rota login">
        <CasebookDl
          rows={[
            {
              key: "Last login",
              value: formatUkDate(magistrate.last_login_on),
            },
            {
              key: "Days since login",
              value:
                magistrate.days_since_login != null ? (
                  magistrate.days_since_login >= 90 ? (
                    <strong className="govuk-tag govuk-tag--red">
                      {magistrate.days_since_login}
                    </strong>
                  ) : magistrate.days_since_login >= 30 ? (
                    <strong className="govuk-tag govuk-tag--yellow">
                      {magistrate.days_since_login}
                    </strong>
                  ) : (
                    magistrate.days_since_login
                  )
                ) : (
                  "Not in rota login report"
                ),
            },
          ]}
        />
      </CasebookAccordion>
    </CasebookSidebar>
  );
}
