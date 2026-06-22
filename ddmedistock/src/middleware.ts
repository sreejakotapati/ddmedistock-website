import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/jwt";
import { applySecurityHeaders, docsContentSecurityPolicy, marketingContentSecurityPolicy } from "@/lib/security/headers";
import { authLimiter, apiLimiter, clientIp } from "@/lib/security/rate-limit";
import { isRequestAllowed } from "@/lib/security/csrf";

// Role-based route protection (RBAC). Runs on the edge for portal sections.
const STAFF = ["ADMIN", "PROCUREMENT_MANAGER", "SUPER_ADMIN"];
const RULES: { prefix: string; roles: string[] }[] = [
  { prefix: "/customer", roles: ["CUSTOMER"] },
  { prefix: "/admin", roles: STAFF },
  { prefix: "/vendor", roles: ["VENDOR"] },
];
const HOME: Record<string, string> = {
  CUSTOMER: "/customer", VENDOR: "/vendor",
  ADMIN: "/admin", PROCUREMENT_MANAGER: "/admin", SUPER_ADMIN: "/admin",
};

// Public brochure pages that get the relaxed marketing CSP (fonts + map embed).
const MARKETING_PATHS = new Set([
  "/", "/about", "/products", "/exports", "/compliance", "/contact",
]);

const IS_PROD = process.env.NODE_ENV === "production";

/** Attach security headers to any response we return. */
function withSecurity(res: NextResponse): NextResponse {
  applySecurityHeaders(res.headers, { hsts: IS_PROD });
  return res;
}

function tooMany(retryAfter: number, limit: number): NextResponse {
  const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
  res.headers.set("Retry-After", String(retryAfter));
  res.headers.set("X-RateLimit-Limit", String(limit));
  return withSecurity(res);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  // 1. API hardening: CSRF + rate limiting.
  if (isApi) {
    // CSRF: reject cross-site state-changing requests. Compare the Origin/
    // Referer host against the actual Host header (what the browser sent),
    // falling back to nextUrl.host which Next may normalize.
    const allowed = isRequestAllowed({
      method: req.method,
      host: req.headers.get("host") || req.nextUrl.host,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
    });
    if (!allowed) {
      return withSecurity(NextResponse.json({ error: "CSRF validation failed" }, { status: 403 }));
    }

    // Rate limiting: stricter on auth endpoints.
    const ip = clientIp(req.headers);
    const isAuth = pathname.startsWith("/api/auth");
    const limiter = isAuth ? authLimiter : apiLimiter;
    const rl = limiter.check(`${isAuth ? "auth" : "api"}:${ip}`);
    if (!rl.allowed) return tooMany(rl.retryAfter, rl.limit);
  }

  // 2. Portal RBAC.
  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  if (rule) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return withSecurity(NextResponse.redirect(url));
    }
    if (!rule.roles.includes(session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = HOME[session.role] ?? "/";
      return withSecurity(NextResponse.redirect(url));
    }
  }

  // 3. Default: continue with security headers attached.
  const res = withSecurity(NextResponse.next());
  // The /docs (Swagger UI) page needs a relaxed CSP for the jsDelivr CDN.
  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    res.headers.set("Content-Security-Policy", docsContentSecurityPolicy());
  }
  // The public marketing site needs Google Fonts + the Google Maps embed.
  else if (MARKETING_PATHS.has(pathname)) {
    res.headers.set("Content-Security-Policy", marketingContentSecurityPolicy());
  }
  return res;
}

export const config = {
  // Run on everything so security headers apply site-wide; skip Next internals,
  // static assets, and common public files. RBAC/CSRF/rate-limit logic inside
  // the middleware self-scopes to portal and /api paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
