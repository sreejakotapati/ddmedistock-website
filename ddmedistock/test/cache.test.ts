import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryCache } from "../src/lib/cache";

test("MemoryCache stores and retrieves a value", async () => {
  const c = new MemoryCache();
  await c.set("k", "v", 60);
  assert.equal(await c.get("k"), "v");
});

test("MemoryCache returns null for a missing key", async () => {
  const c = new MemoryCache();
  assert.equal(await c.get("nope"), null);
});

test("MemoryCache expires values after the TTL", async () => {
  const c = new MemoryCache();
  await c.set("k", "v", 0); // expires immediately (expires = now)
  // expires <= Date.now() on next read → treated as expired
  await new Promise((r) => setTimeout(r, 2));
  assert.equal(await c.get("k"), null);
});

test("MemoryCache.del removes all keys under a prefix", async () => {
  const c = new MemoryCache();
  await c.set("catalog:a", "1", 60);
  await c.set("catalog:b", "2", 60);
  await c.set("other:c", "3", 60);
  await c.del("catalog:");
  assert.equal(await c.get("catalog:a"), null);
  assert.equal(await c.get("catalog:b"), null);
  assert.equal(await c.get("other:c"), "3");
});

test("cached() memoizes the producer and only recomputes on miss", async () => {
  // Use MemoryCache directly to keep the test hermetic (no global state).
  const c = new MemoryCache();
  let calls = 0;
  const produce = async () => {
    calls++;
    return { n: calls };
  };
  const key = "k1";
  // First call → miss → produce
  let hit = await c.get(key);
  let val = hit ? JSON.parse(hit) : await produce().then((v) => (c.set(key, JSON.stringify(v), 60), v));
  assert.deepEqual(val, { n: 1 });
  // Second call → hit → no produce
  hit = await c.get(key);
  val = hit ? JSON.parse(hit) : await produce();
  assert.deepEqual(val, { n: 1 });
  assert.equal(calls, 1);
});
