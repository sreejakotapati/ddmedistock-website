import { test } from "node:test";
import assert from "node:assert/strict";
import { notDeleted, activeWhere } from "../src/lib/soft-delete";

test("notDeleted is the canonical active filter", () => {
  assert.deepEqual(notDeleted, { deletedAt: null });
});

test("activeWhere merges deletedAt:null into an existing clause", () => {
  assert.deepEqual(activeWhere({ active: true }), { active: true, deletedAt: null });
});

test("activeWhere works with no argument", () => {
  assert.deepEqual(activeWhere(), { deletedAt: null });
});

test("activeWhere does not mutate the input object", () => {
  const input = { role: "ADMIN" };
  activeWhere(input);
  assert.deepEqual(input, { role: "ADMIN" });
});
