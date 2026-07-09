import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { OrionLogo } from "../components/OrionLogo";
import { RoleSelector } from "../components/RoleSelector";
import { useRole } from "../context/RoleContext";

type NavDropdownItem = {
  label: string;
  to: string;
};

function navLinkClassName(isActive: boolean) {
  return isActive ? "orion-app-header__nav-link orion-app-header__nav-link--active" : "orion-app-header__nav-link";
}

function NavDropdown({
  label,
  items,
  isSectionActive,
}: {
  label: string;
  items: NavDropdownItem[];
  isSectionActive: boolean;
}) {
  const menuId = useId();
  const containerRef = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <li className="orion-app-header__nav-item orion-app-header__nav-item--dropdown" ref={containerRef}>
      <button
        type="button"
        className={
          isSectionActive
            ? "orion-app-header__nav-link orion-app-header__nav-link--active orion-app-header__nav-link--menu"
            : "orion-app-header__nav-link orion-app-header__nav-link--menu"
        }
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <span className="orion-app-header__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul className="orion-app-header__dropdown" id={menuId} role="menu">
          {items.map((item) => (
            <li key={item.to} role="none">
              <NavLink
                to={item.to}
                role="menuitem"
                className={({ isActive }) =>
                  isActive
                    ? "orion-app-header__dropdown-link orion-app-header__dropdown-link--active"
                    : "orion-app-header__dropdown-link"
                }
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrionHeader() {
  const { canViewRoster } = useRole();
  const location = useLocation();
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const magistrateItems: NavDropdownItem[] = [
    { label: "All magistrates", to: "/magistrates" },
    { label: "On leave", to: "/magistrates/on-leave" },
  ];

  if (canViewRoster) {
    magistrateItems.push({ label: "Roster", to: "/magistrates/roster" });
  }

  const magistratesActive = location.pathname.startsWith("/magistrates");

  return (
    <header className="orion-app-header" role="banner">
      <div className="orion-app-header__bar">
        <div className="orion-app-header__inner govuk-width-container">
          <Link to="/" className="orion-app-header__brand">
            <OrionLogo className="orion-app-header__logo" />
            <span className="orion-app-header__brand-text">
              <span className="orion-app-header__brand-name">Orion</span>
              <span className="orion-app-header__brand-tagline">Court management</span>
            </span>
          </Link>

          <button
            type="button"
            className="orion-app-header__menu-toggle"
            aria-expanded={mobileOpen}
            aria-controls={navId}
            onClick={() => setMobileOpen((current) => !current)}
          >
            <span className="orion-app-header__menu-toggle-icon" aria-hidden="true" />
            <span className="govuk-visually-hidden">{mobileOpen ? "Hide menu" : "Show menu"}</span>
          </button>

          <nav
            id={navId}
            className={mobileOpen ? "orion-app-header__nav orion-app-header__nav--open" : "orion-app-header__nav"}
            aria-label="Main navigation"
          >
            <ul className="orion-app-header__nav-list">
              <li className="orion-app-header__nav-item">
                <NavLink to="/" end className={({ isActive }) => navLinkClassName(isActive)}>
                  Dashboard
                </NavLink>
              </li>
              <NavDropdown label="Magistrates" items={magistrateItems} isSectionActive={magistratesActive} />
              <li className="orion-app-header__nav-item">
                <NavLink to="/reports" className={({ isActive }) => navLinkClassName(isActive)}>
                  Reports
                </NavLink>
              </li>
              <li className="orion-app-header__nav-item orion-app-header__nav-item--role">
                <RoleSelector />
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
