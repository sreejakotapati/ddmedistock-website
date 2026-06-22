import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, MemoryStore, clientIp } from "../src/lib/security/rate-limit";
import { isRequestAllowed, isSafeMethod } from "../src/lib/security/csrf";
import { securityHeaders, contentSecurityPolicy } from "../src/lib/security/headers";

// ── Rate limiting ─────────────────────────────────────────────────────────────

test("RateLimiter allows up to the limit, then blocks within the window", () => {
  const rl = new RateLimiter({ limit: 3, windowMs: 1000, store: new MemoryStore() });
  const t = 1_000_000;
  assert.equal(rl.check("k", t).allowed, true);
  assert.equal(rl.check("k", t).allowed, true);
  const third = rl.check("k", t);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);
  const fourth = rl.check("k", t);
  assert.equal(fourth.allowed, false);
  assert.ok(fourth.retryAfter > 0);
});

test("RateLimiter resets after the window elapses", () => {
  const rl = new RateLimiter({ limit: 1, windowMs: 1000, store: new MemoryStore() });
  assert.equal(rl.check("k", 0).allowed, true);
  assert.equal(rl.check("k", 500).allowed, false); // same window
  assert.equal(rl.check("k", 1000).allowed, true); // window rolled over
});

test("RateLimiter isolates keys", () => {
  const rl = new RateLimiter({ limit: 1, windowMs: 1000, store: new MemoryStore() });
  assert.equal(rl.check("a", 0).allowed, true);
  assert.equal(rl.check("b", 0).allowed, true); // different key, own budget
  assert.equal(rl.check("a", 0).allowed, false);
});

test("MemoryStore.prune drops expired windows", () => {
  const store = new MemoryStore();
  store.hit("x", 1000, 0);
  assert.equal(store.size, 1);
  store.prune(2000);
  assert.equal(store.size, 0);
});

test("clientIp prefers x-forwarded-for first hop", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientIp(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
  assert.equal(clientIp(new Headers()), "unknown");
});

// ── CSRF ─────────────────────────────────────────────────────────────────────

test("safe methods always pass CSRF", () => {
  assert.ok(isSafeMethod("GET"));
  assert.ok(isRequestAllowed({ method: "GET", host: "app.com", origin: null, referer: null }));
});

test("same-origin POST passes; cross-origin POST is rejected", () => {
  assert.ok(isRequestAllowed({ method: "POST", host: "app.com", origin: "https://app.com", referer: null }));
  assert.equal(
    isRequestAllowed({ method: "POST", host: "app.com", origin: "https://evil.com", referer: null }),
    false,
  );
});

test("POST falls back to Referer when Origin is absent", () => {
  assert.ok(isRequestAllowed({ method: "POST", host: "app.com", origin: null, referer: "https://app.com/x" }));
  assert.equal(
    isRequestAllowed({ method: "POST", host: "app.com", origin: null, referer: "https://evil.com/x" }),
    false,
  );
});

test("POST with no Origin and no Referer is rejected", () => {
  assert.equal(isRequestAllowed({ method: "POST", host: "app.com", origin: null, referer: null }), false);
});

// ── Security headers ──────────────────────────────────────────────────────────

test("security headers include the core protections", () => {
  const h = securityHeaders();
  assert.equal(h["X-Frame-Options"], "DENY");
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.ok(h["Content-Security-Policy"].includes("default-src 'self'"));
  assert.ok(h["Referrer-Policy"].length > 0);
  assert.ok(h["Permissions-Policy"].includes("geolocation=()"));
});

test("HSTS only present when requested (production/https)", () => {
  assert.equal(securityHeaders({ hsts: false })["Strict-Transport-Security"], undefined);
  assert.ok(securityHeaders({ hsts: true })["Strict-Transport-Security"].includes("max-age="));
});

test("CSP forbids framing and object embedding", () => {
  const csp = contentSecurityPolicy();
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(csp.includes("object-src 'none'"));
});

test("CSP allows inline scripts (Next.js hydration); unsafe-eval is dev-only", () => {
  const env = process.env as Record<string, string | undefined>;
  const original = env.NODE_ENV;
  try {
    env.NODE_ENV = "production";
    const prod = contentSecurityPolicy();
    // Next.js App Router needs inline scripts to hydrate.
    assert.ok(prod.includes("script-src 'self' 'unsafe-inline'"), "prod needs unsafe-inline scripts");
    // But production must never allow eval'd scripts.
    assert.ok(!prod.includes("unsafe-eval"), "prod CSP must not allow unsafe-eval");

    env.NODE_ENV = "development";
    const dev = contentSecurityPolicy();
    assert.ok(dev.includes("unsafe-eval"), "dev CSP should allow unsafe-eval for HMR/Fast Refresh");
  } finally {
    env.NODE_ENV = original;
  }
});
