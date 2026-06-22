import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { openapiSpec } from "../src/lib/openapi/spec";

const spec = openapiSpec as {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
  components: { schemas: Record<string, unknown> };
};

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

test("spec is OpenAPI 3.1 with info", () => {
  assert.equal(spec.openapi, "3.1.0");
  assert.ok(spec.info.title.length > 0);
  assert.match(spec.info.version, /^\d+\.\d+\.\d+$/);
});

test("every documented API path maps to a real route file", () => {
  for (const path of Object.keys(spec.paths)) {
    if (!path.startsWith("/api/")) continue;
    if (path === "/api/openapi") continue; // covered separately
    const rel = path.replace(/^\//, "").replace(/\{(\w+)\}/g, "[$1]");
    const file = join(process.cwd(), "src", "app", rel, "route.ts");
    assert.ok(existsSync(file), `missing route file for ${path}: ${file}`);
  }
});

test("documented methods exist as exports in their route file", async () => {
  const { readFileSync } = await import("node:fs");
  for (const [path, ops] of Object.entries(spec.paths)) {
    if (!path.startsWith("/api/") || path === "/api/openapi") continue;
    const rel = path.replace(/^\//, "").replace(/\{(\w+)\}/g, "[$1]");
    const src = readFileSync(join(process.cwd(), "src", "app", rel, "route.ts"), "utf8");
    for (const method of Object.keys(ops)) {
      if (!HTTP_METHODS.includes(method)) continue;
      const upper = method.toUpperCase();
      assert.match(
        src,
        new RegExp(`export\\s+(async\\s+)?function\\s+${upper}\\b`),
        `${path}: route file does not export ${upper}`,
      );
    }
  }
});

test("every operation declares at least one response", () => {
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (!HTTP_METHODS.includes(method)) continue;
      assert.ok(op.responses && Object.keys(op.responses).length > 0, `${method} ${path} has no responses`);
    }
  }
});

test("all $ref schema references resolve to a defined component", () => {
  const defined = new Set(Object.keys(spec.components.schemas));
  const json = JSON.stringify(spec);
  const refs = [...json.matchAll(/"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, "expected some schema refs");
  for (const r of refs) assert.ok(defined.has(r), `undefined schema ref: ${r}`);
});

test("security-scoped operations reference the cookieAuth scheme", () => {
  // POST /api/rfqs requires auth — sanity check the security wiring exists.
  const rfq = spec.paths["/api/rfqs"].post as { security?: { cookieAuth: unknown[] }[] };
  assert.ok(rfq.security && rfq.security.length > 0, "POST /api/rfqs should declare security");
});
