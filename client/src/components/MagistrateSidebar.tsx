import { Link } from "react-router-dom";
import {
  CasebookAccordion,
  CasebookDl,
  CasebookSidebar,
} from "./casebook/CasebookChrome";
import { ContactNumberEditor } from "./ContactNumberEditor";
import { HomeCourtEditor } from "./HomeCourtEditor";
import { MagistrateFieldEditor } from "./MagistrateFieldEditor";
import { SittingLocationsEditor } from "./SittingLocationsEditor";
import { SidebarLeaveEditor } from "./SidebarLeaveEditor";
import { hasSupportNeeds, SupportNeedsAlert } from "./SupportNeedsAlert";
import { isRetiringSoon } from "../lib/retirement";
import type { MagistrateDetail, MagistrateSummary } from "../types/domain";

type MagistrateLike = MagistrateSummary | MagistrateDetail;

function formatUkDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function daysSinceLoginFrom(lastLoginOn: string | null): number | null {
  if (!lastLoginOn) return null;
  const date = new Date(`${lastLoginOn}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function MagistrateSidebar({
  magistrate,
  canViewNames = true,
  profileHref,
  editable = false,
  onMagistrateUpdated,
  onLeavesChanged,
}: {
  magistrate: MagistrateLike;
  canViewNames?: boolean;
  profileHref?: string;
  editable?: boolean;
  onMagistrateUpdated?: (magistrate: MagistrateDetail) => void;
  onLeavesChanged?: () => void;
}) {
  const supportNeedsSet = hasSupportNeeds(magistrate.reasonable_adjustments);
  const titleText = `${magistrate.display_name}: ${magistrate.reference_code}`;
  const email = magistrate.email?.trim() || null;
  const sittingLocations =
    "sitting_locations" in magistrate && Array.isArray(magistrate.sitting_locations)
      ? magistrate.sitting_locations
      : [];

  function handleUpdated(updated: MagistrateDetail) {
    onMagistrateUpdated?.(updated);
  }

  return (
    <CasebookSidebar
      title={
        <>
          {titleText}
          {supportNeedsSet ? <SupportNeedsAlert className="orion-support-needs-alert--sidebar" /> : null}
        </>
      }
      ariaLabel={titleText}
    >
      <CasebookAccordion title="Personal details" defaultOpen>
        {canViewNames ? (
          <>
            <p className="csbk-sidebar__name">
              {magistrate.full_name ? magistrate.full_name : magistrate.display_name}
              {supportNeedsSet ? <SupportNeedsAlert /> : null}
            </p>
            {editable ? (
              <CasebookDl
                rows={[
                  {
                    key: "First name",
                    value: (
                      <MagistrateFieldEditor
                        magistrateId={magistrate.id}
                        label="First name"
                        field="first_name"
                        value={magistrate.first_name}
                        clearable={false}
                        onUpdated={handleUpdated}
                      />
                    ),
                  },
                  {
                    key: "Last name",
                    value: (
                      <MagistrateFieldEditor
                        magistrateId={magistrate.id}
                        label="Last name"
                        field="last_name"
                        value={magistrate.last_name}
                        clearable={false}
                        onUpdated={handleUpdated}
                      />
                    ),
                  },
                ]}
              />
            ) : null}
          </>
        ) : (
          <p className="csbk-sidebar__name">
            {magistrate.display_name}
            {supportNeedsSet ? <SupportNeedsAlert /> : null}
          </p>
        )}
        <CasebookDl
          rows={[
            { key: "Reference", value: magistrate.reference_code },
            {
              key: "Cluster",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Cluster"
                  field="cluster"
                  value={magistrate.cluster}
                  clearable={false}
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.cluster
              ),
            },
            {
              key: "Bench",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Bench"
                  field="bench"
                  value={magistrate.bench}
                  clearable={false}
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.bench
              ),
            },
            {
              key: "Role",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Role"
                  field="presiding_justice"
                  value={magistrate.presiding_justice}
                  kind="boolean"
                  clearable={false}
                  options={[
                    { value: "false", label: "Winger" },
                    { value: "true", label: "Presiding Justice" },
                  ]}
                  display={magistrate.presiding_justice ? "Presiding Justice" : "Winger"}
                  onUpdated={handleUpdated}
                />
              ) : magistrate.presiding_justice ? (
                "Presiding Justice"
              ) : (
                "Winger"
              ),
            },
            {
              key: "Email address",
              value: canViewNames ? (
                editable ? (
                  <MagistrateFieldEditor
                    magistrateId={magistrate.id}
                    label="Email address"
                    field="email"
                    value={email}
                    display={
                      email ? (
                        <a href={`mailto:${email}`} className="govuk-link csbk-dl__email">
                          {email}
                        </a>
                      ) : (
                        "Not recorded"
                      )
                    }
                    onUpdated={handleUpdated}
                  />
                ) : email ? (
                  <a href={`mailto:${email}`} className="govuk-link csbk-dl__email">
                    {email}
                  </a>
                ) : (
                  "Not recorded"
                )
              ) : (
                "Hidden"
              ),
            },
            {
              key: "Contact number",
              value: canViewNames ? (
                <ContactNumberEditor
                  magistrateId={magistrate.id}
                  contactNumber={magistrate.contact_number}
                  editable={editable}
                  onUpdated={(_contactNumber, updated) => {
                    if (updated) handleUpdated(updated);
                  }}
                />
              ) : (
                "Hidden"
              ),
            },
            {
              key: "Appointed",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Appointed"
                  field="date_of_appointment"
                  value={magistrate.date_of_appointment}
                  kind="date"
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.date_of_appointment ?? "Not recorded"
              ),
            },
            {
              key: "Retirement",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Retirement"
                  field="retirement_on"
                  value={magistrate.retirement_on}
                  kind="date"
                  display={
                    magistrate.retirement_on ? (
                      isRetiringSoon(magistrate.retirement_on) ? (
                        <strong className="govuk-tag govuk-tag--yellow">
                          {magistrate.retirement_on}
                        </strong>
                      ) : (
                        magistrate.retirement_on
                      )
                    ) : undefined
                  }
                  onUpdated={handleUpdated}
                />
              ) : magistrate.retirement_on ? (
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
              value: editable ? (
                <HomeCourtEditor
                  magistrateId={magistrate.id}
                  homeCourthouse={magistrate.home_courthouse}
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.home_courthouse?.name ?? "Not recorded"
              ),
            },
            {
              key: "Sitting locations",
              value: editable ? (
                <SittingLocationsEditor
                  magistrateId={magistrate.id}
                  sittingLocations={sittingLocations}
                  onUpdated={handleUpdated}
                />
              ) : sittingLocations.length > 0 ? (
                sittingLocations.map((court) => court.name).join(", ")
              ) : (
                "None recorded"
              ),
            },
          ]}
        />
      </CasebookAccordion>

      <CasebookAccordion title="Appraisal">
        <CasebookDl
          rows={[
            {
              key: "Status",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Appraisal status"
                  field="appraisal_status"
                  value={magistrate.appraisal_status}
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.appraisal_status ?? "Not recorded"
              ),
            },
            {
              key: "Cycle",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Appraisal cycle (years)"
                  field="appraisal_cycle_years"
                  value={magistrate.appraisal_cycle_years}
                  kind="number"
                  display={
                    magistrate.appraisal_cycle_years
                      ? `Every ${magistrate.appraisal_cycle_years} years`
                      : "Not recorded"
                  }
                  onUpdated={handleUpdated}
                />
              ) : magistrate.appraisal_cycle_years ? (
                `Every ${magistrate.appraisal_cycle_years} years`
              ) : (
                "Not recorded"
              ),
            },
            {
              key: "Last appraisal",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Last appraisal"
                  field="last_appraisal_on"
                  value={magistrate.last_appraisal_on}
                  kind="date"
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.last_appraisal_on ?? "Not recorded"
              ),
            },
            {
              key: "Last appraiser",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Last appraiser"
                  field="last_appraiser"
                  value={magistrate.last_appraiser}
                  onUpdated={handleUpdated}
                />
              ) : (
                magistrate.last_appraiser ?? "Not recorded"
              ),
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
              <SidebarLeaveEditor
                key={leave.id}
                magistrateId={magistrate.id}
                leave={leave}
                editable={editable}
                onChanged={() => onLeavesChanged?.()}
              />
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
        <p className="govuk-body-s govuk-!-margin-bottom-0">Derived from sittings — not editable.</p>
      </CasebookAccordion>

      <CasebookAccordion
        title={
          <>
            Support needs
            {supportNeedsSet ? <SupportNeedsAlert /> : null}
          </>
        }
        defaultOpen={supportNeedsSet}
      >
        {editable ? (
          <MagistrateFieldEditor
            magistrateId={magistrate.id}
            label="Support needs"
            field="reasonable_adjustments"
            value={magistrate.reasonable_adjustments}
            kind="textarea"
            emptyLabel="None recorded"
            onUpdated={handleUpdated}
          />
        ) : (
          <p className="govuk-body-s">
            {magistrate.reasonable_adjustments?.trim() || "None recorded"}
          </p>
        )}
      </CasebookAccordion>

      <CasebookAccordion title="Rota login">
        <CasebookDl
          rows={[
            {
              key: "Last login",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Last login"
                  field="last_login_on"
                  value={magistrate.last_login_on}
                  kind="date"
                  display={formatUkDate(magistrate.last_login_on)}
                  withAttrs={(next) => ({
                    days_since_login:
                      typeof next === "string" ? daysSinceLoginFrom(next) : null,
                  })}
                  onUpdated={handleUpdated}
                />
              ) : (
                formatUkDate(magistrate.last_login_on)
              ),
            },
            {
              key: "Days since login",
              value: editable ? (
                <MagistrateFieldEditor
                  magistrateId={magistrate.id}
                  label="Days since login"
                  field="days_since_login"
                  value={magistrate.days_since_login}
                  kind="number"
                  display={
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
                    )
                  }
                  emptyLabel="Not in rota login report"
                  onUpdated={handleUpdated}
                />
              ) : magistrate.days_since_login != null ? (
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
