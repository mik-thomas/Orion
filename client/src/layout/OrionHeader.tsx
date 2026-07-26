import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { RoleSelector } from "../components/RoleSelector";
import { OrionLogo } from "../components/OrionLogo";
import { useAuth } from "../context/AuthContext";
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
  align = "left",
}: {
  label: string;
  items: NavDropdownItem[];
  isSectionActive: boolean;
  align?: "left" | "right";
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
        <ul
          className={
            align === "right"
              ? "orion-app-header__dropdown orion-app-header__dropdown--right"
              : "orion-app-header__dropdown"
          }
          id={menuId}
          role="menu"
        >
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
  const { canViewRoster, role } = useRole();
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const manageItems: NavDropdownItem[] = [
    { label: "All magistrates", to: "/magistrates" },
    { label: "On leave", to: "/magistrates/on-leave" },
    { label: "Tasks", to: "/tasks" },
    { label: "Reports", to: "/reports" },
  ];

  if (canViewRoster) {
    manageItems.splice(2, 0, { label: "Roster", to: "/magistrates/roster" });
  }

  const manageActive =
    location.pathname.startsWith("/magistrates") ||
    location.pathname.startsWith("/tasks") ||
    location.pathname.startsWith("/reports");

  const userLabel = session?.displayName?.split(" ")[0] ?? role;

  return (
    <header className="orion-app-header" role="banner">
      <div className="orion-app-header__bar">
        <div className="orion-app-header__inner govuk-width-container">
          <Link to="/" className="orion-app-header__brand">
            <OrionLogo className="orion-app-header__logo" />
            <span className="orion-app-header__brand-text">
              <span className="orion-app-header__brand-name">orion</span>
              <span className="orion-app-header__brand-tagline">Demo</span>
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
                  Home
                </NavLink>
              </li>
              <li className="orion-app-header__nav-item">
                <NavLink to="/magistrates" className={({ isActive }) => navLinkClassName(isActive)}>
                  Find magistrate
                </NavLink>
              </li>
              <li className="orion-app-header__nav-item">
                <NavLink to="/tasks" className={({ isActive }) => navLinkClassName(isActive)}>
                  Tasks
                </NavLink>
              </li>
              <NavDropdown label="Manage" items={manageItems} isSectionActive={manageActive} />
              <li className="orion-app-header__nav-item orion-app-header__nav-item--role">
                <div className="orion-session-chip">
                  {session?.role === "Developer" ? (
                    <RoleSelector />
                  ) : (
                    <span className="orion-session-chip__role">{role}</span>
                  )}
                  {session?.displayName && (
                    <span className="orion-session-chip__user">{userLabel}</span>
                  )}
                  <button
                    type="button"
                    className="orion-session-chip__sign-out"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
