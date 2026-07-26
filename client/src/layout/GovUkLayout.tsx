import { Outlet } from "react-router-dom";
import { DemoDisclaimerModal } from "../components/DemoDisclaimerModal";
import { OpenTasksReminderModal } from "../components/OpenTasksReminderModal";
import { OrionHeader } from "./OrionHeader";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";

export function GovUkLayout() {
  const { session } = useAuth();
  const { canViewNames } = useRole();
  const showingAnonymised = Boolean(session) && !canViewNames;

  return (
    <div className="csbk-app govuk-template">
      <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
        Skip to main content
      </a>

      <DemoDisclaimerModal />
      <OpenTasksReminderModal />

      <OrionHeader />

      <div className="csbk-flash-bar">
        <div className="govuk-width-container">
          <div className={`csbk-flash ${showingAnonymised ? "csbk-flash--warning" : "csbk-flash--info"}`}>
            <span className="csbk-flash__badge">{showingAnonymised ? "Demo" : "Info"}</span>
            <div className="csbk-flash__message">
              {showingAnonymised
                ? "Demo data — magistrate names and reference codes are randomised for your role."
                : "Signed in with real identifiable magistrate data. Share Bench Chair credentials with colleagues for anonymised demos."}
            </div>
          </div>
        </div>
      </div>

      <main className="csbk-app__main" id="main-content" role="main" tabIndex={-1}>
        <div className="govuk-width-container">
          <Outlet />
        </div>
      </main>

      <footer className="csbk-footer" role="contentinfo">
        <div className="csbk-footer__inner">
          <h2 className="csbk-footer__title">About Orion</h2>
          <div className="csbk-footer__meta">
            <p>Orion magistrate management — interface inspired by Casebook.</p>
            <p>Created by Michael Thomas</p>
            <p>
              {showingAnonymised
                ? "Demo data — names and codes are randomised. Sitting counts and locations remain real."
                : "Only authorised roles see real identifiable magistrate details."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
