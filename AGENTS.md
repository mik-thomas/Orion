# Agent guide (Cursor)

## Local

```bash
npm run setup   # once: deps, docker Postgres, db:prepare
npm run dev     # http://localhost:5173 → proxies /api to :3001
npm run check   # CI parity before PR
npm run import:south-yorkshire   # import South Yorkshire spreadsheets (ORION_IMPORT_ROOT)
```

## Ship to staging (Railway)

**Deploy by default** after shippable implementation work (unless the user says not to). Also deploy when they say “deploy”, “ship”, or “release”. Run `npm run deploy -- -m "…"` and report the result (see `.cursor/rules/deploy-command.mdc`).

That script: `npm run check` → commit (if needed) → push → PR → wait for CI → merge `main` → Railway auto-deploy.

Manual equivalent: branch off `main` → PR → CI green → merge → Railway.

Do not use `railway up` for normal releases.
