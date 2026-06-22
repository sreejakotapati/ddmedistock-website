// CSRF protection — origin/referer validation for state-changing requests.
//
// Because the session is a SameSite=Lax cookie, cross-site POSTs are already
// largely blocked by the browser; this adds defence-in-depth by rejecting any
// unsafe-method request whose Origin (or Referer) host doesn't match the
// request host. Pure and unit-testable.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export type CsrfInput = {
  method: string;
  /** Host the request was sent to (from the Host header / request URL). */
  host: string;
  origin: string | null;
  referer: string | null;
};

/**
 * Returns true when the request is allowed, false when it should be rejected
 * as a probable cross-site forgery. Safe methods always pass. Unsafe methods
 * must carry an Origin or Referer whose host matches the request host.
 */
export function isRequestAllowed({ method, host, origin, referer }: CsrfInput): boolean {
  if (isSafeMethod(method)) return true;

  const originHost = hostFromUrl(origin);
  const refererHost = hostFromUrl(referer);

  // Require at least one same-origin indicator on unsafe methods.
  if (originHost) return originHost === host;
  if (refererHost) return refererHost === host;

  // No Origin/Referer on a state-changing request → reject.
  return false;
}
