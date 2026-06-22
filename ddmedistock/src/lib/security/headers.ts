// Security headers (Helmet-equivalent for Next.js).
//
// Applied to every response in middleware. Values are conservative but
// compatible with the app (Next.js inlines some styles, so style-src allows
// 'unsafe-inline'; we avoid 'unsafe-inline' for scripts in production).

export type SecurityHeaderOptions = {
  /** Send HSTS (only meaningful over HTTPS / in production). */
  hsts?: boolean;
};

/** Build the Content-Security-Policy string. */
export function contentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== "production";
  // Next.js (App Router) ships inline bootstrap/hydration scripts on every
  // page, so 'unsafe-inline' is required for scripts or React never hydrates
  // (blank page + CSP violations). Dev additionally needs 'unsafe-eval' for
  // Fast Refresh / HMR. A nonce-based policy would be stricter but requires
  // per-request middleware plumbing Next doesn't expose cleanly here.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // API + same-origin fetches only (dev also needs the HMR websocket).
    isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// Swagger UI is loaded from jsDelivr on the /docs page only; this CSP relaxes
// script/style/font/img for that CDN while keeping the rest locked down.
const SWAGGER_CDN = "https://cdn.jsdelivr.net";

/** CSP for the /docs (Swagger UI) page. */
export function docsContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${SWAGGER_CDN}`,
    `style-src 'self' 'unsafe-inline' ${SWAGGER_CDN}`,
    `img-src 'self' data: ${SWAGGER_CDN}`,
    `font-src 'self' data: ${SWAGGER_CDN}`,
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * CSP for the public marketing site. Relaxes only what the brochure pages need:
 * Google Fonts (style + font), the Google Maps embed (frame + map tiles/images),
 * while keeping scripts, connections and everything else locked to same-origin.
 */
export function marketingContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://maps.gstatic.com https://*.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "frame-src https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** The full set of security response headers. */
export function securityHeaders(opts: SecurityHeaderOptions = {}): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Security-Policy": contentSecurityPolicy(),
    // Clickjacking protection (belt-and-braces with frame-ancestors).
    "X-Frame-Options": "DENY",
    // Don't let browsers MIME-sniff responses.
    "X-Content-Type-Options": "nosniff",
    // Limit referrer leakage.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Lock down powerful features by default.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-DNS-Prefetch-Control": "off",
    "X-XSS-Protection": "0", // modern browsers: rely on CSP, disable legacy auditor
  };
  if (opts.hsts) {
    h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  return h;
}

/** Mutate a Headers object in place with the security headers. */
export function applySecurityHeaders(headers: Headers, opts: SecurityHeaderOptions = {}): void {
  for (const [k, v] of Object.entries(securityHeaders(opts))) headers.set(k, v);
}
