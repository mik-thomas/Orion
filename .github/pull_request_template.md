## Summary

<!-- What changed and why -->

## Test plan

- [ ] `npm run check` passes locally
- [ ] Tested in browser at http://localhost:5173 (if UI/API changed)

## Deploy

Merging to **`main`** triggers GitHub **CI**, then Railway deploys to staging when **Wait for CI** is enabled:

- API: https://orion-staging.up.railway.app
- Client: https://orion-client-staging.up.railway.app

Do not merge until CI is green and the change is approved.
