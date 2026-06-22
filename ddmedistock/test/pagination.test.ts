import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePageParams, paginate, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../src/lib/pagination";

function params(obj: Record<string, string>) {
  return { get: (k: string) => (k in obj ? obj[k] : null) };
}

test("parsePageParams defaults to page 1 and the default page size", () => {
  const p = parsePageParams(params({}));
  assert.equal(p.page, 1);
  assert.equal(p.pageSize, DEFAULT_PAGE_SIZE);
  assert.equal(p.skip, 0);
  assert.equal(p.take, DEFAULT_PAGE_SIZE);
});

test("parsePageParams computes skip from page", () => {
  const p = parsePageParams(params({ page: "3", pageSize: "10" }));
  assert.equal(p.skip, 20);
  assert.equal(p.take, 10);
});

test("parsePageParams clamps page size to the max and floors invalid input", () => {
  assert.equal(parsePageParams(params({ pageSize: "9999" })).pageSize, MAX_PAGE_SIZE);
  assert.equal(parsePageParams(params({ page: "0" })).page, 1);
  assert.equal(parsePageParams(params({ page: "-5" })).page, 1);
  assert.equal(parsePageParams(params({ pageSize: "abc" })).pageSize, DEFAULT_PAGE_SIZE);
});

test("parsePageParams respects custom defaults", () => {
  const p = parsePageParams(params({}), { defaultPageSize: 24, maxPageSize: 50 });
  assert.equal(p.pageSize, 24);
  assert.equal(parsePageParams(params({ pageSize: "1000" }), { maxPageSize: 50 }).pageSize, 50);
});

test("paginate builds a correct envelope", () => {
  const env = paginate([1, 2, 3], 25, parsePageParams(params({ page: "2", pageSize: "10" })));
  assert.equal(env.total, 25);
  assert.equal(env.totalPages, 3);
  assert.equal(env.page, 2);
  assert.equal(env.hasNext, true);
  assert.equal(env.hasPrev, true);
});

test("paginate edge cases: empty and single page", () => {
  const empty = paginate([], 0, parsePageParams(params({})));
  assert.equal(empty.totalPages, 0);
  assert.equal(empty.hasNext, false);
  assert.equal(empty.hasPrev, false);

  const one = paginate([1], 1, parsePageParams(params({ page: "1", pageSize: "10" })));
  assert.equal(one.totalPages, 1);
  assert.equal(one.hasNext, false);
  assert.equal(one.hasPrev, false);
});
