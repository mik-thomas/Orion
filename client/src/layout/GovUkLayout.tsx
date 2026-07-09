import { Link, Outlet } from "react-router-dom";
import { RoleSelector } from "../components/RoleSelector";
import { useRole } from "../context/RoleContext";

export function GovUkLayout() {
  const { canViewRoster } = useRole();

  return (
    <div className="govuk-template">
      <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
        Skip to main content
      </a>

      <header className="govuk-header orion-header" role="banner" data-module="govuk-header">
        <div className="govuk-header__container govuk-width-container">
          <div className="govuk-header__logo">
            <Link to="/" className="govuk-header__link govuk-header__link--homepage">
              <span className="orion-header__brand">
                <img
                  src="/orion-logo.svg"
                  alt=""
                  className="orion-header__logo"
                  width={36}
                  height={36}
                />
                <span className="govuk-header__logotype">
                  <span className="govuk-header__logotype-text">Orion</span>
                </span>
              </span>
              <span className="govuk-header__product-name">Court management</span>
            </Link>
          </div>
          <nav aria-label="Top level navigation" className="govuk-header__navigation">
            <ul className="govuk-header__navigation-list">
              <li className="govuk-header__navigation-item">
                <Link to="/" className="govuk-header__link">
                  Dashboard
                </Link>
              </li>
              <li className="govuk-header__navigation-item">
                <Link to="/magistrates" className="govuk-header__link">
                  Magistrates
                </Link>
              </li>
              <li className="govuk-header__navigation-item">
                <Link to="/magistrates/on-leave" className="govuk-header__link">
                  On leave
                </Link>
              </li>
              {canViewRoster && (
                <li className="govuk-header__navigation-item">
                  <Link to="/magistrates/roster" className="govuk-header__link">
                    Roster
                  </Link>
                </li>
              )}
              <li className="govuk-header__navigation-item">
                <Link to="/reports" className="govuk-header__link">
                  Reports
                </Link>
              </li>
              <li className="govuk-header__navigation-item orion-header__role">
                <RoleSelector />
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="govuk-phase-banner">
        <div className="govuk-width-container">
          <p className="govuk-phase-banner__content">
            <strong className="govuk-tag govuk-phase-banner__content__tag">Beta</strong>
            <span className="govuk-phase-banner__text">
              Role selection is for demonstration — production needs proper sign-in and access control.
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
              <h2 className="govuk-visually-hidden">Support links</h2>
              <span className="govuk-footer__licence-description">
                Orion magistrate management — styled using the GOV.UK Design System.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
