# Laptop setup

Clone and run — three commands to be up locally.

```bash
git clone https://github.com/mik-thomas/Orion.git && cd Orion
npm run laptop-setup
npm run dev
```

Open http://localhost:5173 (API on :3001 via proxy).

## Prerequisites

Node 20+, Ruby 3.x, Docker Desktop, Git. `laptop-setup` checks these and prints install hints if missing.

## Optional

```bash
# South Yorkshire spreadsheets — place files under ~/Desktop/Courts, then:
export ORION_IMPORT_ROOT=~/Desktop/Courts
npm run import:south-yorkshire

# Ship to Railway production (after changes):
npm run deploy -- -m "your message"
```

## URLs

| Environment | Client | API |
| --- | --- | --- |
| Local | http://localhost:5173 | http://127.0.0.1:3001 |
| Production | https://orion-client-production.up.railway.app | https://orion-production-7f9f.up.railway.app |

Railway has a single **`production`** environment (no staging hostnames).

**Railway note:** `orion-client` service must have **Root Directory** = `client` (not repo root), or it builds the Rails API by mistake.
