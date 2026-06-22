# Task: Investigate & Stabilize Playwright E2E (separate from deployment)

**Priority:** Medium (non-blocking — E2E is a secondary signal; `npm run verify`
is the deployment gate).
**Owner:** _unassigned_
**Status:** Open

## Goal

Get the Chromium E2E suite reliably green in CI, or convert genuinely
environment-dependent tests into clearly-scoped checks — without weakening the
primary verification framework.

## Recommended fixes (in order)

1. **Capture real signal first.** In a branch, temporarily set the e2e job to
   upload `playwright-report/` and `test-results/` (traces, screenshots, video)
   and read the actual error. Do not fix blind — confirm which of H1–H5
   (see ROOT-CAUSE-ANALYSIS.md) is real.

2. **Harden `login()` (addresses H1, most likely).**
   - Wait for hydration before interacting:
     `await page.waitForLoadState("networkidle")` after `goto("/login")`, and
     `await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled()`.
   - After submit, assert a stable post-login element (portal nav/heading) in
     addition to `waitForURL`.
   - Raise `expect`/navigation timeout for CI cold starts (e.g. 30s).

3. **Make server-ready DB-aware (H2).** Point the Playwright `webServer.url`
   health check at an endpoint that exercises the DB, or add a pre-test step
   that polls `GET /api/openapi` AND a seeded read; retry the first login once.

4. **Keep credentials sourced from seed (H3).** Add a tiny pretest assertion
   (or reuse `verify-auth`) that every `USERS` email exists before running specs,
   failing with a clear message.

5. **Stabilize the browser install (H5).** Pin the Playwright version, cache
   `~/.cache/ms-playwright`, and retry `playwright install` on failure.

6. **Re-enable as blocking only when green 5× consecutively.** Until then keep
   `continue-on-error: true`.

## Acceptance criteria

- [ ] Real failure cause confirmed from a CI trace (not hypothesized).
- [ ] All 13 E2E tests pass on 5 consecutive CI runs.
- [ ] No change to application/business logic to make tests pass (only test
      harness + CI), or if a real defect is found, it is fixed under its own PR
      with a regression test added to `npm run verify`.
- [ ] `continue-on-error` removed once stable.

## Explicitly out of scope

- Do not relax `npm run verify`, the security checks, or the workflow checks to
  accommodate E2E.
- Do not block PR merges/deploys on E2E while this task is open.
