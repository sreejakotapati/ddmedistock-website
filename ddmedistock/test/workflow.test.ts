import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  nextStates,
  assertTransition,
  InvalidTransitionError,
} from "../src/lib/workflow";

test("Quotation: legal forward path AI_GENERATED→…→PUBLISHED→ARCHIVED", () => {
  assert.ok(canTransition("QUOTATION", "DRAFT", "AI_GENERATED"));
  assert.ok(canTransition("QUOTATION", "AI_GENERATED", "UNDER_REVIEW"));
  assert.ok(canTransition("QUOTATION", "UNDER_REVIEW", "PENDING_APPROVAL"));
  assert.ok(canTransition("QUOTATION", "PENDING_APPROVAL", "APPROVED"));
  assert.ok(canTransition("QUOTATION", "APPROVED", "PUBLISHED"));
  assert.ok(canTransition("QUOTATION", "PUBLISHED", "ARCHIVED"));
});

test("Quotation: cannot skip approval to publish, cannot leave terminal", () => {
  assert.equal(canTransition("QUOTATION", "DRAFT", "PUBLISHED"), false);
  assert.equal(canTransition("QUOTATION", "AI_GENERATED", "PUBLISHED"), false);
  assert.equal(canTransition("QUOTATION", "ARCHIVED", "PUBLISHED"), false);
});

test("Quotation: rejection path returns PENDING_APPROVAL → DRAFT", () => {
  assert.ok(canTransition("QUOTATION", "PENDING_APPROVAL", "DRAFT"));
});

test("RFQ: submission and processing path", () => {
  assert.ok(canTransition("RFQ", "DRAFT", "SUBMITTED"));
  assert.ok(canTransition("RFQ", "SUBMITTED", "PROCESSING"));
  assert.ok(canTransition("RFQ", "PROCESSING", "MATCHING_COMPLETED"));
  assert.ok(canTransition("RFQ", "MATCHING_COMPLETED", "QUOTATION_IN_PROGRESS"));
});

test("RFQ: anything can be rejected except terminal states", () => {
  assert.ok(canTransition("RFQ", "SUBMITTED", "REJECTED"));
  assert.ok(canTransition("RFQ", "QUOTATION_IN_PROGRESS", "REJECTED"));
  assert.equal(canTransition("RFQ", "PUBLISHED", "REJECTED"), false);
});

test("same-state transition is an idempotent no-op (allowed)", () => {
  assert.ok(canTransition("QUOTATION", "DRAFT", "DRAFT"));
  assert.ok(canTransition("RFQ", "PUBLISHED", "PUBLISHED"));
});

test("nextStates returns the configured options", () => {
  assert.deepEqual(nextStates("QUOTATION", "APPROVED").sort(), ["PUBLISHED", "UNDER_REVIEW"].sort());
  assert.deepEqual(nextStates("QUOTATION", "ARCHIVED"), []);
  assert.deepEqual(nextStates("RFQ", "UNKNOWN"), []);
});

test("assertTransition throws InvalidTransitionError on illegal move", () => {
  assert.throws(() => assertTransition("QUOTATION", "DRAFT", "PUBLISHED"), InvalidTransitionError);
  assert.doesNotThrow(() => assertTransition("QUOTATION", "APPROVED", "PUBLISHED"));
});
