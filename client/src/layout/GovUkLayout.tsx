import { Outlet } from "react-router-dom";
import { DemoDisclaimerModal } from "../components/DemoDisclaimerModal";
import { OrionHeader } from "./OrionHeader";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";

export function GovUkLayout() {
  const { session } = useAuth();
  const { canViewNames } = useRole();
  const showingAnonymised = Boolean(session) && !canViewNames;

  return (
    <div className="govuk-template">
      <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
        Skip to main content
      </a>

      <DemoDisclaimerModal />

      <OrionHeader />

      <div className="govuk-phase-banner">
        <div className="govuk-width-container">
          <p className="govuk-phase-banner__content">
            <strong className="govuk-tag govuk-phase-banner__content__tag">Beta</strong>
            <span className="govuk-phase-banner__text">
              {showingAnonymised
                ? "Demo data — magistrate names and reference codes are randomised for your role."
                : "Signed in with real identifiable magistrate data. Share Bench Chair credentials with colleagues for anonymised demos."}
            </span>
          </p>
        </div>
      </div>

      <main className="govuk-main-wrapper govuk-main-wrapper--auto-spacing" id="main-content" role="main">
        <div className="govuk-width-container">
          <Outlet />
        </div>
      </main>

      <footer className="govuk-footer" role="contentinfo">
        <div className="govuk-width-container">
          <div className="govuk-footer__meta">
            <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
              <h2 className="govuk-visually-hidden">About this service</h2>
              <span className="govuk-footer__licence-description">
                Orion magistrate management — styled using the GOV.UK Design System.
              </span>
              <p className="govuk-footer__licence-description govuk-!-margin-top-2 govuk-!-margin-bottom-0">
                Created by Michael Thomas
              </p>
              <p className="govuk-footer__licence-description govuk-!-margin-top-1 govuk-!-margin-bottom-0">
                {showingAnonymised
                  ? "Demo data — names and codes are randomised. Sitting counts and locations remain real."
                  : "Only authorised roles see real identifiable magistrate details."}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
