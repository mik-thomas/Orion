const ENVIRONMENTS = {
  staging: { label: "Staging", className: "env-pill--staging" },
  production: { label: "Prod", className: "env-pill--production" },
};

function resolveEnvironmentKey() {
  const raw = (process.env.ORION_ENV || process.env.RAILWAY_ENVIRONMENT_NAME || "").toLowerCase();
  if (raw in ENVIRONMENTS) return raw;
  return null;
}

function getEnvironmentBanner() {
  const key = resolveEnvironmentKey();
  if (!key) return null;
  const { label, className } = ENVIRONMENTS[key];
  return { key, label, className };
}

function injectEnvironmentBanner(html) {
  const banner = getEnvironmentBanner();
  const pill = banner
    ? `<span class="env-pill ${banner.className}" role="status" aria-label="${banner.label} environment">${banner.label}</span>`
    : "";
  return html.replace("<!-- ENV_PILL -->", pill);
}

module.exports = { getEnvironmentBanner, injectEnvironmentBanner, resolveEnvironmentKey };
