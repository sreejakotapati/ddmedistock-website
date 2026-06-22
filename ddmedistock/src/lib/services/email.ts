// Email delivery.
//
// Thin abstraction over an email provider. Resend (Phase 6) plugs in here when
// RESEND_API_KEY is set; until then sendEmail logs the message and returns
// "skipped", so the email queue and its retry/DLQ wiring are exercisable today
// without a provider.

import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("email");

export type EmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export type EmailResult = { delivered: boolean; provider: "resend" | "none"; id?: string };

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send an email. With RESEND_API_KEY set, posts to the Resend REST API
 * (no SDK dependency). Otherwise logs and returns skipped. Throws on provider
 * error so the queue can retry / dead-letter.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  if (!isEmailEnabled()) {
    log.info({ to: msg.to, subject: msg.subject }, "email.skipped (RESEND_API_KEY not set)");
    return { delivered: false, provider: "none" };
  }
  const from = process.env.EMAIL_FROM || "DD MediStock <no-reply@ddmedistock.example>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? msg.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  log.info({ to: msg.to, id: data.id }, "email.sent");
  return { delivered: true, provider: "resend", id: data.id };
}
