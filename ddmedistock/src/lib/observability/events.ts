// Domain event logging — the observability companion to the DB audit trail.
//
// audit() (services/audit.ts) writes a durable, queryable record to the
// AuditLog table. These helpers additionally emit structured logs so the same
// significant events (logins, RFQ/quotation changes) show up in the log stream
// for real-time monitoring/alerting, with no secrets attached.

import { moduleLogger } from "./logger";

const log = moduleLogger("events");

type Actor = { userId?: string | null; role?: string | null; ip?: string | null };

/** Authentication events (login success/failure, logout). */
export function logAuthEvent(
  event: "login_success" | "login_failure" | "logout" | "register",
  actor: Actor & { email?: string },
): void {
  // Email is a business identifier (not a secret) and useful for tracing
  // brute-force attempts; password is never passed in.
  log.info({ event, userId: actor.userId, role: actor.role, ip: actor.ip, email: actor.email }, `auth.${event}`);
}

/** RFQ lifecycle events. */
export function logRfqEvent(
  event: "created" | "processed" | "status_changed" | "rejected",
  data: { rfqId: string; userId?: string | null; from?: string; to?: string; items?: number },
): void {
  log.info({ event: `rfq.${event}`, ...data }, `rfq.${event}`);
}

/** Quotation lifecycle events. */
export function logQuotationEvent(
  event: "drafted" | "edited" | "submitted" | "approved" | "rejected" | "published",
  data: { quotationId: string; userId?: string | null; from?: string; to?: string },
): void {
  log.info({ event: `quotation.${event}`, ...data }, `quotation.${event}`);
}
