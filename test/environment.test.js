const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { getEnvironmentBanner, injectEnvironmentBanner } = require("../lib/environment");

const originalOrion = process.env.ORION_ENV;
const originalRailway = process.env.RAILWAY_ENVIRONMENT_NAME;

afterEach(() => {
  if (originalOrion === undefined) delete process.env.ORION_ENV;
  else process.env.ORION_ENV = originalOrion;
  if (originalRailway === undefined) delete process.env.RAILWAY_ENVIRONMENT_NAME;
  else process.env.RAILWAY_ENVIRONMENT_NAME = originalRailway;
});

test("staging banner", () => {
  process.env.RAILWAY_ENVIRONMENT_NAME = "staging";
  const banner = getEnvironmentBanner();
  assert.equal(banner.label, "Staging");
  const html = injectEnvironmentBanner("<!-- ENV_PILL -->");
  assert.match(html, /env-pill--staging/);
  assert.match(html, />Staging</);
});

test("production banner", () => {
  process.env.RAILWAY_ENVIRONMENT_NAME = "production";
  const banner = getEnvironmentBanner();
  assert.equal(banner.label, "Prod");
  const html = injectEnvironmentBanner("<!-- ENV_PILL -->");
  assert.match(html, /env-pill--production/);
  assert.match(html, />Prod</);
});
