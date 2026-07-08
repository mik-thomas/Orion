import { Link, Outlet } from "react-router-dom";

export function GovUkLayout() {
  return (
    <div className="govuk-template">
      <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
        Skip to main content
      </a>

      <header className="govuk-header" role="banner" data-module="govuk-header">
        <div className="govuk-header__container govuk-width-container">
          <div className="govuk-header__logo">
            <Link to="/" className="govuk-header__link govuk-header__link--homepage">
              <span className="govuk-header__logotype">
                <span className="govuk-header__logotype-text">Orion</span>
              </span>
              <span className="govuk-header__product-name">Magistrates</span>
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
                <Link to="/reports" className="govuk-header__link">
                  Reports
                </Link>
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
              This is a new service — sitting data imports will be added soon.
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
