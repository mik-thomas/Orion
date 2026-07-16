# Orion

UK magistrate bench and court management for HMCTS clusters (South Yorkshire / North West focus). Profiles, sittings, leave, rotas, and reports — with a GOV.UK Design System–themed UI.

## Stack

| Layer | Tech |
| --- | --- |
| API | Rails (Postgres) |
| Client | React + Vite |
| Hosting | Railway (monorepo: API + client) |

## Live URLs

| Environment | Client | API |
| --- | --- | --- |
| Production | https://orion-client-production.up.railway.app | https://orion-production-7f9f.up.railway.app |

Both Railway services deploy from `main` on GitHub. There is no separate Railway staging environment — only **`production`**.

## Laptop / local setup

Full details: [docs/laptop-setup.md](docs/laptop-setup.md). Prerequisites: Node 20+, Ruby 3.x, Docker Desktop, Git.

```bash
git clone https://github.com/mik-thomas/Orion.git && cd Orion
npm run laptop-setup
npm run dev
```

Open http://localhost:5173 (API on :3001 via Vite proxy).

Useful extras: `npm run setup` (deps + Docker Postgres + db), `npm run check` (CI parity).

## Import (South Yorkshire)

Place spreadsheets under `ORION_IMPORT_ROOT` (default `~/Desktop/Courts`), then:

```bash
export ORION_IMPORT_ROOT=~/Desktop/Courts
npm run import:south-yorkshire                 # fresh (truncates)
npm run import:south-yorkshire -- --additive   # append / upsert, no truncate
npm run import:south-yorkshire -- --resume     # continue after failure/cancel
npm run import:south-yorkshire -- --production --additive  # Railway via CLI
```

~13k sitting rows; typically ~5–15 min local, ~15–45 min on Railway. Resume without a checkpoint infers completed phases from the DB; sittings dedupe by `import_key`.

## Deploy

```bash
npm run deploy -- -m "short summary of changes"
```

Runs checks → commit (if needed) → push → PR → CI → merge to `main` → Railway auto-deploy. Do **not** use `railway up` for routine releases.

## Sign-in (MVP demo)

The app is gated behind `/login`. Demo auth issues a signed session token and sets the signed-in role (Bench Chair by default).

| Username | Password | Role |
| --- | --- | --- |
| `bench.chair` | `BenchChair-Demo-2026` | Bench Chair |

These are **demo credentials** (also the API default when `ORION_DEMO_USERS` is unset). Override in production with Railway env:

```bash
ORION_DEMO_USERS='[{"username":"bench.chair","password":"choose-a-password","role":"Bench Chair","display_name":"Bench Chair"}]'
```

Production: https://orion-client-production.up.railway.app/login

## Role visibility (MVP)

After sign-in, the client sends `X-Orion-Role` from the session (Bench Chair for the demo user). Not real SSO — production needs proper authentication.

| Role | Sees names | Roster |
| --- | --- | --- |
| HMCTS-SLM, Developer | Yes | Yes |
| Bench Chair, Deputy | Reference codes only | No (403) |

API default when the role header is missing: **Deputy** (most restrictive). Logged-out users cannot use the app UI.

## About

Created by Michael Thomas. Identifiable magistrate details are access-controlled; Bench Chair and Deputy users see reference codes only, not names.

## Agent notes

See [AGENTS.md](AGENTS.md) for Cursor/agent workflows.
