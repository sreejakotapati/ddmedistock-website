# Playwright E2E — Root Cause Analysis

> **Confidence note.** Hypotheses are ranked from the test/app source. They are
> NOT confirmed against CI logs or a local browser run (neither is available in
> the authoring environment). The stabilization task confirms with a real
> trace before applying fixes.

## Established facts that narrow the cause

1. The same login → RFQ → approve → publish logic passes in `npm run verify`
   (HTTP + service level) and in 92 unit tests. ⇒ **not an app-logic defect.**
2. `request`-context E2E assertions (401/403/headers/openapi) duplicate
   `verify-api.ts`, which passes. ⇒ those E2E tests are very likely green too.
3. Every remaining suspect test funnels through one helper: `login()`.
   ⇒ a **single shared failure point** is the most probable explanation.

## Ranked hypotheses

### H1 — `login()` navigation/timing in CI (MOST LIKELY)
`login()` clicks "Sign in" then races `waitForURL(home)` against an error
locator, 15s timeout. The login handler does `router.push()` **client-side**
after a `fetch` to `/api/auth/login`. In CI (cold server, first paint, hydration
not yet complete when the click fires) the SPA navigation can be missed or slow,
tripping the 15s wait.
- **Signature to confirm:** `Timeout 15000ms exceeded waiting for navigation to /customer`.
- **Fix direction:** wait for the form to be hydrated/interactive before filling;
  increase per-action timeout; assert on a stable post-login element (e.g. portal
  nav) rather than only URL; add `await page.waitForLoadState("networkidle")`.

### H2 — Server not fully ready when tests start
The webserver waits on `GET /login` returning 200, but the **DB-backed** login
needs migrations+seed applied. The job seeds before building, but a race or a
slow first DB connection could yield a 500 on the first login POST.
- **Signature:** first login test fails, later ones pass (flaky/ordered).
- **Fix direction:** health-check an endpoint that touches the DB; retry once.

### H3 — Seed/credential drift (ALREADY HIT TWICE, now guarded)
The customer email changed during the rebrand; helper was out of sync (fixed in
`9b7c8d1`). A residual mismatch (e.g. a role's `home` path, or vendor seed) could
remain.
- **Signature:** `login(<role>) rejected: an error message was shown…`.
- **Mitigation in place:** `verify-auth` + `verify-database` assert seeded users
  exist and credentials hash-verify; keep E2E `USERS` sourced from the same seed.

### H4 — Rate limiting (ADDRESSED, low probability now)
~7 logins/IP could trip the 10/min auth limiter. The e2e job sets
`AUTH_RATE_LIMIT=1000`, so this should be resolved; listed for completeness.
- **Signature:** later login tests return HTTP 429.

### H5 — Playwright browser/deps install in CI (environmental)
`npx playwright install --with-deps chromium` can fail on transient apt/registry
issues (observed locally: apt PPA signing error, Chromium download failure).
- **Signature:** job fails before any test runs.
- **Fix direction:** pin Playwright version; cache the browser; retry the install.

## Why this does not block deployment

The behaviors E2E checks are independently verified by the primary gate
(`npm run verify`): auth, RBAC, CSRF, headers, and the full RFQ/quotation/
approval workflow against a real database. Under the project policy, a green
primary gate ⇒ deployable; a red E2E with green primary ⇒ test-environment
issue to stabilize separately (this document + the task).
