// API endpoint verification: boots the production server and probes real
// endpoints for auth gating, CSRF, public docs, and security headers — without
// a browser. Run standalone: `npx tsx scripts/verify-api.ts`.

import { Reporter, printSection, sh, type Section } from "./verify/lib";

const PORT = Number(process.env.VERIFY_PORT || 3333);
const BASE = `http://127.0.0.1:${PORT}`;

async function waitReady(timeoutMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function verifyApi(): Promise<Section> {
  const r = new Reporter("API");

  // Need a build to `next start`. If absent, surface as a warning, not a crash.
  const built = await sh("test -f .next/BUILD_ID || test -f .next/standalone/server.js");
  if (built.code !== 0) {
    r.warn("Production build present", "run `npm run build` first; API probes skipped");
    return r.section();
  }

  const { spawn } = await import("node:child_process");
  const server = spawn("bash", ["-lc", `npm run start -- -p ${PORT}`], {
    stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production", AUTH_RATE_LIMIT: "1000", API_RATE_LIMIT: "5000" },
    detached: true,
  });

  try {
    const ready = await waitReady();
    if (!ready) {
      r.fail("Server boot", `did not become ready on :${PORT}`);
      return r.section();
    }
    r.pass("Server boot", `production server ready on :${PORT}`);

    // 4. API endpoint verification.
    await r.check("GET /api/openapi is public + valid 3.1", async () => {
      const res = await fetch(`${BASE}/api/openapi`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      if (body.openapi !== "3.1.0") throw new Error(`openapi=${body.openapi}`);
      return `3.1.0, ${Object.keys(body.paths).length} paths`;
    });

    await r.check("GET /api/catalog requires auth (401)", async () => {
      const res = await fetch(`${BASE}/api/catalog`);
      if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
      return "unauthenticated → 401";
    });

    await r.check("GET /api/admin/queues requires staff (401 anon)", async () => {
      const res = await fetch(`${BASE}/api/admin/queues`);
      if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
      return "unauthenticated → 401";
    });

    await r.check("CSRF: cross-origin POST /api/auth/login → 403", async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
        body: JSON.stringify({ email: "a@b.com", password: "x" }),
      });
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
      return "blocked cross-site";
    });

    await r.check("Same-origin invalid login → 401 (passes CSRF)", async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: BASE },
        body: JSON.stringify({ email: "nobody@example.com", password: "wrong" }),
      });
      if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
      return "same-origin reaches handler, bad creds → 401";
    });

    // Security headers (Helmet-equivalent).
    await r.check("Security headers present", async () => {
      const res = await fetch(`${BASE}/login`);
      const h = res.headers;
      const missing = ["content-security-policy", "x-frame-options", "x-content-type-options"].filter((k) => !h.get(k));
      if (missing.length) throw new Error(`missing: ${missing.join(", ")}`);
      return `CSP, X-Frame-Options=${h.get("x-frame-options")}, nosniff`;
    });
  } finally {
    try {
      if (server.pid) process.kill(-server.pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }

  return r.section();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyApi().then((s) => process.exit(printSection(s) === "FAIL" ? 1 : 0));
}
