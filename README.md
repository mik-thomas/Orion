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

## Sign-in

The app is gated behind `/login`. Username/password auth issues a revocable server session token. Role and PII access come from the authenticated user — not from a client-spoofable header.

| Username | Password | Role | Real PII |
| --- | --- | --- | --- |
| `bench.chair` | `BenchChair-Demo-2026` | Bench Chair | **No** — randomised demo names (**share with colleagues**) |
| `developer` | `Developer-Demo-2026` | Developer | **Yes** — Michael only |

Full details and other seed accounts: [docs/login.md](docs/login.md).

Production: https://orion-client-production.up.railway.app/login

## Role visibility / PII gate

**Only Developer sees real identifiable data by default** (`ORION_SHOW_REAL_PII_ROLES=developer`). Other roles get **stable randomised** fake names and `DEMO-****` codes in API JSON; sitting stats stay real. Expand the allowlist via env if needed (e.g. `developer,hmcts-slm`).

| Role | Real PII | What they see | Roster |
| --- | --- | --- | --- |
| Developer | Yes | Real names / codes / emails | Yes |
| HMCTS-SLM, Bench Chair, Deputy | No | Fake names + `DEMO-****` | No (403) |

Verify: `npm run verify:pii-gate`. This is Orion app login, not HMCTS SSO yet.

## Tasks (delegation)

Bench Chair creates tasks and delegates them to the Deputy (`/tasks`). Deputies update status and report notes; Bench Chair and Developer see all tasks and summary counts. Seeded demo tasks appear after `db:seed`.

| Who | Can do |
| --- | --- |
| Bench Chair / Developer | Create, assign (defaults to Deputy), list all, update, cancel |
| Deputy | List assigned tasks, update status + report notes |
| HMCTS-SLM | List / view all (read-only) |

Local: http://localhost:5173/tasks — Production: https://orion-client-production.up.railway.app/tasks

## About

Created by Michael Thomas. Identifiable magistrate details are API-enforced; non-authorised roles see randomised demo names, not real PII.

## Agent notes

See [AGENTS.md](AGENTS.md) for Cursor/agent workflows.
