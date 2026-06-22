// Notification fan-out — the single entry point for lifecycle events.
//
// Each event is delivered through two channels via the queue layer:
//   • in-app notification  (notification-delivery queue → Notification table)
//   • email                (email-delivery queue → Resend)
// When REDIS_URL is unset, enqueue() runs the delivery inline, so events are
// still delivered without Redis. Email is best-effort: it no-ops without
// RESEND_API_KEY (see services/email.ts).

import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/queue/producer";
import { QUEUE_NAMES } from "@/lib/queue/config";
import { sendEmail } from "./email";
import { deliverNotification, type NotificationJob } from "./notify-delivery";
import { STAFF_ROLES } from "@/lib/constants";
import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("notifications");

const APP_NAME = "DD MediStock";

/** Queue an in-app notification for a user. */
async function pushNotification(job: NotificationJob): Promise<void> {
  await enqueue(QUEUE_NAMES.NOTIFICATION_DELIVERY, "notify", job, (d) => deliverNotification(d));
}

/** Queue an email (no-ops downstream if RESEND_API_KEY is unset). */
async function pushEmail(to: string | null | undefined, subject: string, text: string): Promise<void> {
  if (!to) return;
  await enqueue(
    QUEUE_NAMES.EMAIL_DELIVERY,
    "email",
    { to, subject: `[${APP_NAME}] ${subject}`, text },
    async (d) => {
      await sendEmail(d);
    },
  );
}

/** Emails + user ids of all active staff who can review/approve. */
async function staffRecipients(): Promise<{ id: string; email: string }[]> {
  const staff = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES }, deletedAt: null },
    select: { id: true, email: true },
  });
  return staff;
}

// ── Lifecycle events ──────────────────────────────────────────────────────────

/** RFQ submitted by a customer — acknowledge to the submitter. */
export async function notifyRfqSubmitted(rfqId: string): Promise<void> {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: { createdBy: { select: { id: true, email: true } } },
  });
  if (!rfq?.createdBy) return;
  await pushNotification({
    userId: rfq.createdBy.id,
    title: "RFQ received",
    body: `Your RFQ "${rfq.title}" (${rfq.reference}) has been received and is being processed.`,
    link: `/customer/rfqs/${rfq.id}`,
    type: "RFQ",
  });
  await pushEmail(rfq.createdBy.email, "RFQ received",
    `Your RFQ "${rfq.title}" (${rfq.reference}) has been received and is being processed. We'll notify you when your quotation is ready.`);
  log.info({ rfqId }, "notified.rfq_submitted");
}

/** RFQ processing (AI match) complete — alert staff to review. */
export async function notifyRfqProcessed(rfqId: string): Promise<void> {
  const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
  if (!rfq) return;
  const staff = await staffRecipients();
  await Promise.all(
    staff.map((s) =>
      Promise.all([
        pushNotification({
          userId: s.id,
          title: "RFQ ready for review",
          body: `RFQ ${rfq.reference} has completed AI matching and is ready for review.`,
          link: `/admin/rfqs/${rfq.id}`,
          type: "RFQ",
        }),
        pushEmail(s.email, "RFQ ready for review",
          `RFQ ${rfq.reference} ("${rfq.title}") has completed AI matching and is ready for your review.`),
      ]),
    ),
  );
  log.info({ rfqId, staff: staff.length }, "notified.rfq_processed");
}

/** Quotation submitted for approval — alert approvers. */
export async function notifyApprovalRequested(quotationId: string): Promise<void> {
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { rfq: { select: { reference: true, title: true } } },
  });
  if (!q) return;
  const staff = await staffRecipients();
  await Promise.all(
    staff.map((s) =>
      Promise.all([
        pushNotification({
          userId: s.id,
          title: "Approval requested",
          body: `Quotation ${q.number} (RFQ ${q.rfq.reference}) is awaiting approval.`,
          link: `/admin/quotations/${q.id}`,
          type: "APPROVAL",
        }),
        pushEmail(s.email, "Quotation approval requested",
          `Quotation ${q.number} for RFQ ${q.rfq.reference} ("${q.rfq.title}") is awaiting your approval.`),
      ]),
    ),
  );
  log.info({ quotationId, staff: staff.length }, "notified.approval_requested");
}

/** Quotation published — notify the customer who raised the RFQ. */
export async function notifyQuotationPublished(quotationId: string): Promise<void> {
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { rfq: { include: { createdBy: { select: { id: true, email: true } } } } },
  });
  if (!q?.rfq?.createdBy) return;
  await pushNotification({
    userId: q.rfq.createdBy.id,
    title: "Quotation ready",
    body: `Quotation ${q.number} for "${q.rfq.title}" is now available to download.`,
    link: `/customer/quotations/${q.id}`,
    type: "QUOTATION",
  });
  await pushEmail(q.rfq.createdBy.email, "Your quotation is ready",
    `Quotation ${q.number} for "${q.rfq.title}" is now available. Log in to view and download it.`);
  log.info({ quotationId }, "notified.quotation_published");
}
