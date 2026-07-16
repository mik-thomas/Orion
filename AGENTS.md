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

## Role-based magistrate visibility (MVP)

UI is gated at `/login` (demo session token in `localStorage`). After Bench Chair sign-in, role defaults to **Bench Chair** and is sent as `X-Orion-Role`. This is **not** real SSO — production needs proper authentication.

Demo user (see README): `bench.chair` / `BenchChair-Demo-2026`.

| Role | Sees names | Roster (`/magistrates/roster`) |
| --- | --- | --- |
| HMCTS-SLM, Developer | Yes | Yes |
| Bench Chair, Deputy | Reference codes only | No (403) |

API default when the role header is missing: **Deputy** (most restrictive). Logged-out users are redirected to `/login`.

## Railway production (monorepo)

Both services deploy from `main` on GitHub (`mik-thomas/Orion`):

| Service | Root directory | Config file | Dockerfile |
| --- | --- | --- | --- |
| `orion` (API) | `/` (repo root) | `/railway.json` | root `Dockerfile` |
| `orion-client` | `client` | `/client/railway.json` | `client/Dockerfile` |

If `orion-client` builds the Rails API (missing `secret_key_base`), its Railway service is misconfigured — set **Root Directory** to `client` and **Config file** to `/client/railway.json`. `scripts/railway-production-client.sh` sets client env vars.

Production URLs: API https://orion-production-7f9f.up.railway.app — client https://orion-client-production.up.railway.app
