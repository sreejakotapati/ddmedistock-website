# Playwright E2E — Failure Report

_Status: **E2E is a secondary signal and is non-blocking** (`continue-on-error: true`).
The primary deployability gate is `npm run verify` + `build-and-test` + `docker`,
all green on this branch._

## Scope of this report

This documents the Playwright `e2e` CI job failures on PR #2 and a plan to
stabilize them separately from the deployment path.

> **Evidence limitation (read this first).** The analysis below is derived from
> the **test source and the application code**, not from the CI job logs:
> this environment cannot fetch GitHub Actions logs (API returns 403 for the
> integration) and cannot download/launch Chromium to reproduce locally. The
> root causes are therefore **ranked hypotheses**, not log-confirmed. The
> dedicated task (`docs/e2e/STABILIZATION-TASK.md`) starts by capturing a real
> log/trace to confirm before fixing.

## What we DO know (confirmed)

- `build-and-test` (incl. `npm run verify` — 44 checks: build, routes, DB,
  auth/security, **the full RFQ→match→AI draft→submit→approve→publish
  workflow**, and live API endpoint probes) — **PASS**.
- `docker` image build — **PASS**.
- Unit/integration suite — **92/92 PASS**.
- Therefore the application logic the E2E specs exercise is **independently
  verified green** through non-browser paths. A remaining E2E failure is most
  likely in the **browser/UI layer or the test harness**, not business logic.

## Timeline of e2e runs on this work

| Run | Outcome | Confirmed cause | Fixed in |
|-----|---------|-----------------|----------|
| PR #1 first e2e run | fail | E2E steps bolted onto build-and-test; also auth rate-limit throttling (~7 logins/IP vs 10/min) | split e2e into its own job; `AUTH_RATE_LIMIT` env override (`6095170`) |
| PR #2 run 1 | fail | seeded customer email renamed (`procurement@apollochennai.in`) but helper still used the old `…@cityhospital.in` | `9b7c8d1` |
| PR #2 run 2 | fail | unconfirmed (no log access) — see hypotheses | pending dedicated task |

Two of the three failures were **real, specific bugs that were fixed**; the
latest is not yet log-confirmed.
