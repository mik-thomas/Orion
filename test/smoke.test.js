const http = require("http");
const { spawn } = require("child_process");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const root = path.join(__dirname, "..");
let child;
let port;

function waitForHealth(targetPort, attempts = 40) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      const req = http.get(`http://127.0.0.1:${targetPort}/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else if (tries >= attempts) reject(new Error(`Unexpected status ${res.statusCode}`));
        else setTimeout(tick, 250);
      });
      req.on("error", () => {
        if (tries >= attempts) reject(new Error("Server did not become ready"));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

before(async () => {
  port = 41000 + Math.floor(Math.random() * 1000);
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForHealth(port);
});

after(() => {
  if (child && !child.killed) child.kill("SIGTERM");
});

test("GET /health returns ok", async () => {
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { status: "ok" });
});

test("GET / serves the landing page", async () => {
  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Orion/);
});
