# Demo login (MVP)

Orion is gated behind a simple sign-in until SSO is available.

## URL

- Local: http://localhost:5173/login
- Production: https://orion-client-production.up.railway.app/login

## Bench Chair demo credentials

| Field | Value |
| --- | --- |
| Username | `bench.chair` |
| Password | `BenchChair-Demo-2026` |
| Role after login | **Bench Chair** |

These match the API built-in defaults when `ORION_DEMO_USERS` is not set. They are intentionally fake/demo passwords for MVP — change them via env before any real deployment that needs secrecy.

## How roles work after login

1. `POST /api/v1/session` validates username/password and returns a signed token + role.
2. The client stores the session in `localStorage` (`orion-session`) and sets `orion-role` to the account role (**Bench Chair** for the demo user).
3. API requests send `X-Orion-Role` and `X-Orion-Session`.
4. Refresh keeps you signed in (token valid for 30 days).
5. Sign out clears the session and resets the client role to **Deputy**.
6. If the API receives no role header, it still defaults to **Deputy** (most restrictive). Logged-out users never reach the main app UI.

## Override users

```bash
ORION_DEMO_USERS='[{"username":"bench.chair","password":"choose-a-password","role":"Bench Chair","display_name":"Bench Chair"}]'
```
