# App login (username / password)

Orion uses **application login** with bcrypt-hashed passwords and server-issued session tokens.
This is **not** HMCTS SSO — SSO can replace this later without changing the role model.

## URLs

- Local: http://localhost:5173/login
- Production: https://orion-client-production.up.railway.app/login

## Demo accounts (share with colleagues)

Seeded on `db:seed` (also runs on Railway pre-deploy after migrate):

| Username | Password | Role | Sees real PII? |
| --- | --- | --- | --- |
| `bench.chair` | `BenchChair-Demo-2026` | Bench Chair | **No** — randomised demo names |
| `deputy` | `Deputy-Demo-2026` | Deputy | **No** — randomised demo names |
| `hmcts.slm` | `HmctsSlm-Demo-2026` | HMCTS-SLM | **No** by default |
| `developer` | `Developer-Demo-2026` | Developer | **Yes** — real names / roster / emails |

**For colleague demos:** share `bench.chair` / `BenchChair-Demo-2026`. They see plausible sitting stats with stable fake names and `DEMO-****` codes. Real South Yorkshire identities stay in the DB but are never returned in JSON for their role.

**For Michael (Developer):** use `developer` / `Developer-Demo-2026` to see real identifiable data.

These are intentional shareable demo passwords for MVP. Change them in the Rails console before treating the environment as confidential.

## PII gate (product rule)

**Only roles listed in `ORION_SHOW_REAL_PII_ROLES` see real magistrate PII.** Default:

```bash
ORION_SHOW_REAL_PII_ROLES=developer
```

- Enforced in the **API** on every magistrate JSON field (`display_name`, `full_name`, `first_name`, `last_name`, `reference_code`, roster `email`).
- Non-authorised roles get a **stable per-id** fake identity (same person always maps to the same fake name/code).
- Sitting counts, locations, statuses, and compliance numbers stay real.
- Spoofing `X-Orion-Role: Developer` as Bench Chair does **not** unlock PII — role comes from the authenticated user session. Developers may preview a more restricted role via that header.
- Expand later without code changes, e.g. `ORION_SHOW_REAL_PII_ROLES=developer,hmcts-slm`.

Verify locally:

```bash
cd api && bin/rails orion:verify_pii_gate
# or from repo root:
npm run verify:pii-gate
```

## How auth works

1. `POST /api/v1/session` verifies username/password against the `users` table (`has_secure_password` / bcrypt).
2. The API creates a `user_sessions` row and returns an opaque token (30-day expiry). Only a SHA-256 digest of the token is stored.
3. The client keeps `{ token, username, role, displayName, … }` in `localStorage` (`orion-session`).
4. Authenticated API calls send `X-Orion-Session: <token>`. The server loads the user and sets **role from the account**, not from a client-spoofable header alone.
5. `GET /api/v1/session` validates the token (session restore on refresh) and returns `real_pii` / `names_visible` / `pii_roles`.
6. `DELETE /api/v1/session` deletes the server session (logout).
7. Unauthenticated API requests receive **401** (except health/status and login).

### Role header

- **Normal users:** `X-Orion-Role` is ignored; visibility uses the signed-in user's role.
- **Developer accounts:** may send `X-Orion-Role` to preview Bench Chair / Deputy visibility in the UI (role selector in the header).
- **Local/dev only:** `ORION_ALLOW_ROLE_HEADER=1` allows the old unauthenticated header fallback for scripts. **Never set this in production.**

## Role visibility

| Role | Real names / emails | What they see | Roster |
| --- | --- | --- | --- |
| Developer (default allowlist) | Yes | Real PII | Yes |
| HMCTS-SLM, Bench Chair, Deputy | No | Stable fake names + `DEMO-****` codes | No (403) |

## Creating users

```bash
cd api && bin/rails runner 'User.create!(username: "new.user", password: "Choose-A-Password", password_confirmation: "Choose-A-Password", role: "bench_chair", display_name: "New User")'
```

Roles: `deputy`, `bench_chair`, `hmcts_slm`, `developer`.
