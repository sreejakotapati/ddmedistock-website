// Authentication & security workflow verification: password hashing, JWT
// round-trip, the RBAC capability matrix, and the edge security primitives
// (CSRF, headers, rate limiting). Exercises real code, no server required.
// Run standalone: `npx tsx scripts/verify-auth.ts`.

import { Reporter, printSection, type Section } from "./verify/lib";

export async function verifyAuth(): Promise<Section> {
  const r = new Reporter("Auth & Security");

  // 7. Authentication workflow — hashing + JWT session token.
  await r.check("Password hash + verify round-trip", async () => {
    const { hashPassword, verifyPassword } = await import("../src/lib/auth");
    const hash = await hashPassword("password123");
    if (!(await verifyPassword("password123", hash))) throw new Error("correct password rejected");
    if (await verifyPassword("wrong", hash)) throw new Error("wrong password accepted");
    return "bcrypt verify ok; wrong password rejected";
  });

  await r.check("JWT sign + verify round-trip", async () => {
    const { signToken, verifyToken } = await import("../src/lib/jwt");
    const token = await signToken({ uid: "u1", role: "ADMIN", name: "T", email: "t@x.com" });
    const payload = await verifyToken(token);
    if (payload?.uid !== "u1" || payload.role !== "ADMIN") throw new Error("payload mismatch");
    if (await verifyToken("garbage.token.value")) throw new Error("invalid token accepted");
    return "signed + verified; tampered token rejected";
  });

  // RBAC capability matrix — the Phase-12 rules.
  await r.check("RBAC capability matrix enforces Phase-12 rules", async () => {
    const { can, CAPABILITIES: C } = await import("../src/lib/rbac");
    const must = [
      ["CUSTOMER", C.RFQ_UPLOAD, true],
      ["CUSTOMER", C.QUOTATION_PUBLISH, false],
      ["CUSTOMER", C.PRICING_INTERNAL_VIEW, false],
      ["PROCUREMENT_MANAGER", C.QUOTATION_APPROVE, true],
      ["PROCUREMENT_MANAGER", C.USER_MANAGE, false],
      ["ADMIN", C.USER_MANAGE, true],
      ["SUPER_ADMIN", C.PLATFORM_SETTINGS, true],
      ["VENDOR", C.QUOTATION_APPROVE, false],
    ] as const;
    for (const [role, cap, expected] of must) {
      if (can(role, cap) !== expected) throw new Error(`can(${role}, ${cap}) !== ${expected}`);
    }
    return `${must.length} capability rules hold`;
  });

  await r.check("Only Admin/PM/Super Admin can approve & publish", async () => {
    const { can, CAPABILITIES: C } = await import("../src/lib/rbac");
    const roles = ["CUSTOMER", "VENDOR", "PROCUREMENT_MANAGER", "ADMIN", "SUPER_ADMIN"];
    const approvers = roles.filter((r) => can(r, C.QUOTATION_APPROVE)).sort();
    const expected = ["ADMIN", "PROCUREMENT_MANAGER", "SUPER_ADMIN"];
    if (JSON.stringify(approvers) !== JSON.stringify(expected)) throw new Error(`approvers=${approvers.join(",")}`);
    return approvers.join(", ");
  });

  // Edge security primitives.
  await r.check("CSRF: same-origin allowed, cross-origin blocked", async () => {
    const { isRequestAllowed } = await import("../src/lib/security/csrf");
    if (!isRequestAllowed({ method: "POST", host: "app.com", origin: "https://app.com", referer: null }))
      throw new Error("same-origin POST blocked");
    if (isRequestAllowed({ method: "POST", host: "app.com", origin: "https://evil.com", referer: null }))
      throw new Error("cross-origin POST allowed");
    if (!isRequestAllowed({ method: "GET", host: "app.com", origin: null, referer: null }))
      throw new Error("safe GET blocked");
    return "GET allowed; same-origin POST allowed; cross-origin POST blocked";
  });

  await r.check("Security headers include CSP + clickjacking protection", async () => {
    const { securityHeaders } = await import("../src/lib/security/headers");
    const h = securityHeaders({ hsts: true });
    if (!h["Content-Security-Policy"]?.includes("default-src 'self'")) throw new Error("CSP weak/missing");
    if (h["X-Frame-Options"] !== "DENY") throw new Error("X-Frame-Options not DENY");
    if (!h["Strict-Transport-Security"]) throw new Error("HSTS missing in prod mode");
    return "CSP, X-Frame-Options=DENY, HSTS";
  });

  await r.check("Rate limiter blocks past the limit and resets", async () => {
    const { RateLimiter, MemoryStore } = await import("../src/lib/security/rate-limit");
    const rl = new RateLimiter({ limit: 3, windowMs: 1000, store: new MemoryStore() });
    for (let i = 0; i < 3; i++) if (!rl.check("k", 1000).allowed) throw new Error(`blocked early at ${i}`);
    if (rl.check("k", 1000).allowed) throw new Error("4th request not blocked");
    if (!rl.check("k", 2001).allowed) throw new Error("did not reset after window");
    return "allows N, blocks N+1, resets next window";
  });

  return r.section();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyAuth().then((s) => process.exit(printSection(s) === "FAIL" ? 1 : 0));
}
