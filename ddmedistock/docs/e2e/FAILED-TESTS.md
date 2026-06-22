# Playwright E2E — Test Inventory & Suspected Failures

The suite is **13 tests across 3 specs** (Chromium, serial). Because CI logs are
not accessible from this environment, the "suspected" column is a code-based
assessment of which tests are most likely failing in run 2, not a log readout.
Tests that depend on `login()` share a single failure mode (see RCA).

## e2e/auth.spec.ts — Authentication (4) + Security headers (1)

| # | Test | Depends on login() | Suspected run-2 status |
|---|------|--------------------|------------------------|
| 1 | login page renders the form | no | likely PASS |
| 2 | invalid credentials are rejected | no | likely PASS |
| 3 | customer logs in and lands on the customer portal | yes (customer) | **suspect** |
| 4 | admin logs in and lands on the admin portal | yes (admin) | **suspect** |
| 5 | responses carry the strict security headers | no (request) | likely PASS |

## e2e/rbac.spec.ts — RBAC (4) + API authorization (2)

| # | Test | Depends on login() | Suspected run-2 status |
|---|------|--------------------|------------------------|
| 6 | unauthenticated user is redirected to login | no | likely PASS |
| 7 | customer cannot reach the admin portal | yes (customer) | **suspect** |
| 8 | customer cannot reach the vendor portal | yes (customer) | **suspect** |
| 9 | staff can reach the admin portal | yes (admin) | **suspect** |
| 10 | queue dashboard endpoint rejects anonymous access | no (request) | likely PASS |
| 11 | OpenAPI spec is publicly served | no (request) | likely PASS |

## e2e/rfq-flow.spec.ts — RFQ creation (2)

| # | Test | Depends on login() | Suspected run-2 status |
|---|------|--------------------|------------------------|
| 12 | customer creates an RFQ via the API and it is processed | yes (customer) | **suspect** |
| 13 | cross-site POST to create an RFQ is blocked (CSRF) | no (request) | likely PASS |

## Read

The `request`-only and unauthenticated tests assert behavior already confirmed
green by `verify-api.ts` (openapi public, `/api/catalog` & `/api/admin/queues`
→ 401, cross-origin POST → 403, security headers). The tests that route through
`login()` are the realistic suspects — pointing at a **shared login/UI/timing
issue**, not per-test logic. Confirm against a real trace before fixing.
