import { Outlet } from "react-router-dom";
import { OrionHeader } from "./OrionHeader";

export function GovUkLayout() {
  return (
    <div className="govuk-template">
      <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
        Skip to main content
      </a>

      <OrionHeader />

      <div className="govuk-phase-banner">
        <div className="govuk-width-container">
          <p className="govuk-phase-banner__content">
            <strong className="govuk-tag govuk-phase-banner__content__tag">Beta</strong>
            <span className="govuk-phase-banner__text">
              Demo sign-in is in use — production needs proper SSO and access control.
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
                No identifiable data is displayed for restricted roles. Personal details are
                access-controlled.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
