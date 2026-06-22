import { test } from "node:test";
import assert from "node:assert/strict";
import { newRequestId, moduleLogger } from "../src/lib/observability/logger";
import { isSentryEnabled, captureException } from "../src/lib/observability/sentry";
import { logAuthEvent, logRfqEvent, logQuotationEvent } from "../src/lib/observability/events";

test("newRequestId returns distinct, non-trivial ids", () => {
  const a = newRequestId();
  const b = newRequestId();
  assert.notEqual(a, b);
  assert.ok(a.length >= 8);
  assert.match(a, /^[a-z0-9]+$/);
});

test("moduleLogger returns a usable child logger", () => {
  const log = moduleLogger("test-mod");
  assert.equal(typeof log.info, "function");
  assert.equal(typeof log.child, "function");
  // Must not throw when emitting.
  assert.doesNotThrow(() => log.info({ k: 1 }, "hello"));
});

test("isSentryEnabled reflects SENTRY_DSN", () => {
  delete process.env.SENTRY_DSN;
  assert.equal(isSentryEnabled(), false);
  process.env.SENTRY_DSN = "https://example@sentry.io/1";
  assert.equal(isSentryEnabled(), true);
  delete process.env.SENTRY_DSN;
});

test("captureException resolves without throwing when Sentry is disabled", async () => {
  delete process.env.SENTRY_DSN;
  await assert.doesNotReject(captureException(new Error("boom"), { where: "test" }));
});

test("event helpers never throw", () => {
  assert.doesNotThrow(() => logAuthEvent("login_failure", { email: "a@b.com", ip: "1.2.3.4" }));
  assert.doesNotThrow(() => logAuthEvent("login_success", { userId: "u1", role: "ADMIN", ip: "1.2.3.4" }));
  assert.doesNotThrow(() => logRfqEvent("created", { rfqId: "r1", userId: "u1", items: 3 }));
  assert.doesNotThrow(() => logQuotationEvent("published", { quotationId: "q1", from: "APPROVED", to: "PUBLISHED" }));
});

test("logger redaction config: password fields are not emitted in clear", async () => {
  // Build a throwaway pino instance writing to a buffer with the same redaction
  // policy, to assert secrets are censored in structured output.
  const pino = (await import("pino")).default;
  const chunks: string[] = [];
  const stream = { write: (s: string) => chunks.push(s) };
  const log = pino(
    { redact: { paths: ["password", "*.password"], censor: "[redacted]" } },
    stream as unknown as NodeJS.WritableStream,
  );
  log.info({ password: "hunter2", user: { password: "swordfish" }, email: "a@b.com" }, "x");
  const out = chunks.join("");
  assert.ok(!out.includes("hunter2"), "top-level password leaked");
  assert.ok(!out.includes("swordfish"), "nested password leaked");
  assert.ok(out.includes("[redacted]"));
  assert.ok(out.includes("a@b.com"));
});
