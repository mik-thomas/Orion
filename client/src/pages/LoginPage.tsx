import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import { OrionLogo } from "../components/OrionLogo";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { isAuthenticated, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (ready && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Enter a valid username and password");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to sign in. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="orion-login">
      <a href="#login-form" className="govuk-skip-link" data-module="govuk-skip-link">
        Skip to sign in form
      </a>

      <header className="orion-login__header" role="banner">
        <div className="govuk-width-container orion-login__header-inner">
          <div className="orion-login__brand">
            <OrionLogo className="orion-login__logo" />
            <div className="orion-login__brand-text">
              <span className="orion-login__brand-name">Orion</span>
              <span className="orion-login__brand-tagline">Bench management</span>
            </div>
          </div>
        </div>
      </header>

      <main className="govuk-main-wrapper" id="main-content" role="main">
        <div className="govuk-width-container">
          <div className="orion-login__panel">
            <h1 className="govuk-heading-l">Sign in to Orion</h1>
            <p className="govuk-body">
              Sign in with your Orion username and password. This is Orion app login (not HMCTS SSO).
            </p>

            {error && (
              <div
                className="govuk-error-summary"
                aria-labelledby="login-error-title"
                role="alert"
                tabIndex={-1}
              >
                <h2 className="govuk-error-summary__title" id="login-error-title">
                  There is a problem
                </h2>
                <div className="govuk-error-summary__body">
                  <p className="govuk-body">{error}</p>
                </div>
              </div>
            )}

            <form id="login-form" onSubmit={handleSubmit} noValidate>
              <div className={`govuk-form-group${error ? " govuk-form-group--error" : ""}`}>
                <label className="govuk-label" htmlFor="username">
                  Username
                </label>
                <input
                  className={`govuk-input${error ? " govuk-input--error" : ""}`}
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>

              <div className={`govuk-form-group${error ? " govuk-form-group--error" : ""}`}>
                <label className="govuk-label" htmlFor="password">
                  Password
                </label>
                <input
                  className={`govuk-input${error ? " govuk-input--error" : ""}`}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="govuk-button"
                data-module="govuk-button"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
