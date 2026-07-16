# Agent guide (Cursor)

New machine: see [docs/laptop-setup.md](docs/laptop-setup.md) (`npm run laptop-setup`).

## Local

```bash
npm run setup   # once: deps, docker Postgres, db:prepare
npm run dev     # http://localhost:5173 → proxies /api to :3001
npm run check   # CI parity before PR
npm run import:south-yorkshire   # import South Yorkshire spreadsheets (ORION_IMPORT_ROOT)
npm run import:south-yorkshire -- --resume   # continue after failure/cancel (no truncate; checkpoint optional)

Import ~13k sitting rows. Typical duration: ~5–15 min local Postgres, ~15–45 min on Railway.
Resume without a checkpoint file infers completed phases from the DB; sittings dedupe by `import_key`.
```

## Ship to Railway (production)

**Deploy by default** after shippable implementation work (unless the user says not to). Also deploy when they say “deploy”, “ship”, or “release”. Run `npm run deploy -- -m "…"` and report the result (see `.cursor/rules/deploy-command.mdc`).

That script: `npm run check` → commit (if needed) → push → PR → wait for CI → merge `main` → Railway auto-deploy.

Manual equivalent: branch off `main` → PR → CI green → merge → Railway.

Do not use `railway up` for normal releases. There is no Railway staging environment — only **`production`**.

## Role-based magistrate visibility

UI is gated at `/login` (server session token in `localStorage`). Role and PII access come from the authenticated `User` — **not** from a spoofable `X-Orion-Role` header.

**Only Developer sees real identifiable data by default** (`ORION_SHOW_REAL_PII_ROLES=developer`). Other roles get stable randomised demo names in API JSON. See [docs/login.md](docs/login.md).

| Username | Password | Role |
| --- | --- | --- |
| `developer` | `Developer-Demo-2026` | Developer (Michael — real PII) |
| `bench.chair` | `BenchChair-Demo-2026` | Bench Chair (anonymised — share with colleagues) |

| Role | Real PII | Roster (`/magistrates/roster`) |
| --- | --- | --- |
| Developer | Yes | Yes |
| HMCTS-SLM, Bench Chair, Deputy | No (fake names / `DEMO-****`) | No (403) |

This is Orion app login, not HMCTS SSO. Logged-out users are redirected to `/login`.

## Railway production (monorepo)

Both services deploy from `main` on GitHub (`mik-thomas/Orion`):

| Service | Root directory | Config file | Dockerfile |
| --- | --- | --- | --- |
| `orion` (API) | `/` (repo root) | `/railway.json` | root `Dockerfile` |
| `orion-client` | `client` | `/client/railway.json` | `client/Dockerfile` |

If `orion-client` builds the Rails API (missing `secret_key_base`), its Railway service is misconfigured — set **Root Directory** to `client` and **Config file** to `/client/railway.json`. `scripts/railway-production-client.sh` sets client env vars.

Production URLs: API https://orion-production-7f9f.up.railway.app — client https://orion-client-production.up.railway.app
