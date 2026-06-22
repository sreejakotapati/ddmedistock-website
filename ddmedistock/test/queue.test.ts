import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QUEUE_NAMES,
  ALL_QUEUES,
  dlqName,
  isDlqName,
  jobOptions,
  shouldDeadLetter,
  DLQ_SUFFIX,
} from "../src/lib/queue/config";

test("all six required queues are defined", () => {
  assert.equal(ALL_QUEUES.length, 6);
  for (const q of [
    "rfq-processing", "ocr-processing", "ai-matching",
    "quotation-generation", "notification-delivery", "email-delivery",
  ]) {
    assert.ok(ALL_QUEUES.includes(q as (typeof ALL_QUEUES)[number]), `${q} missing`);
  }
});

test("dlqName / isDlqName round-trip", () => {
  const dlq = dlqName(QUEUE_NAMES.EMAIL_DELIVERY);
  assert.equal(dlq, `email-delivery${DLQ_SUFFIX}`);
  assert.ok(isDlqName(dlq));
  assert.equal(isDlqName(QUEUE_NAMES.EMAIL_DELIVERY), false);
});

test("every queue has a retry policy with backoff", () => {
  for (const q of ALL_QUEUES) {
    const o = jobOptions(q);
    assert.ok(o.attempts >= 1, `${q} attempts`);
    assert.ok(o.backoff.delay > 0, `${q} backoff delay`);
    assert.ok(["exponential", "fixed"].includes(o.backoff.type));
  }
});

test("delivery queues get more retries than processing queues", () => {
  assert.ok(jobOptions(QUEUE_NAMES.EMAIL_DELIVERY).attempts >= 5);
  assert.ok(jobOptions(QUEUE_NAMES.NOTIFICATION_DELIVERY).attempts >= 5);
  assert.ok(jobOptions(QUEUE_NAMES.OCR_PROCESSING).attempts <= 3);
});

test("failed jobs keep their record for DLQ routing (removeOnFail false)", () => {
  assert.equal(jobOptions(QUEUE_NAMES.RFQ_PROCESSING).removeOnFail, false);
});

test("shouldDeadLetter triggers only when retries are exhausted", () => {
  assert.equal(shouldDeadLetter(1, 3), false);
  assert.equal(shouldDeadLetter(2, 3), false);
  assert.equal(shouldDeadLetter(3, 3), true);
  assert.equal(shouldDeadLetter(4, 3), true);
});
