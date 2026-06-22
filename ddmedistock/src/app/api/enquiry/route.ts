// Public marketing-site enquiry endpoint (RFQ / Export / Vendor).
//
// Pipeline on submit:
//   1. Validate (email + phone) and reject spam (honeypot + middleware rate-limit).
//   2. Save the row to Google Sheets via a Google Apps Script Web App webhook
//      (GOOGLE_SHEETS_WEBHOOK_URL). The script appends the row AND emails the
//      notification address (md@sarnga.co.in) using Gmail/MailApp.
//   3. If the webhook is not configured (or fails), fall back to emailing via the
//      Resend abstraction so a notification still goes out.
//   4. Always return success once accepted — no pricing is ever involved here.
//
// See docs/INTEGRATIONS.md for the Apps Script and environment setup.

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/services/email";
import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("enquiry");

// Notification recipient for new website enquiries.
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "md@sarnga.co.in";

const schema = z.object({
  kind: z.enum(["quote", "export", "vendor"]).default("quote"),
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  organisation: z.string().trim().min(1, "Please enter your company name.").max(160),
  email: z.string().trim().email("Please enter a valid email address.").max(160),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return /^[+\d\s()-]+$/.test(v) && digits.length >= 7 && digits.length <= 15;
    }, "Please enter a valid phone number."),
  category: z.string().trim().max(160).optional().default(""),
  market: z.string().trim().max(120).optional().default(""),
  requirement: z.string().trim().max(2000).optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  // Honeypot — bots fill hidden fields; humans don't.
  company_website: z.string().max(0).optional().default(""),
});

const KIND_LABEL: Record<string, string> = {
  quote: "Request a Quote",
  export: "Export Enquiry",
  vendor: "Vendor / Partner Enquiry",
};

/** POST the enquiry to the Google Apps Script Web App (Sheets + email). */
async function saveToGoogleSheet(row: Record<string, string>): Promise<boolean> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: process.env.GOOGLE_SHEETS_WEBHOOK_TOKEN || "", ...row }),
    // Apps Script can be slow on cold start.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`sheet webhook ${res.status}`);
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid submission";
    return NextResponse.json({ error: first }, { status: 400 });
  }
  const d = parsed.data;

  // Silently accept honeypot hits so bots get no signal.
  if (d.company_website) return NextResponse.json({ ok: true });

  const label = KIND_LABEL[d.kind] ?? "Enquiry";
  const when = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  // Combine category + free-text into the single "Requirement" sheet column.
  const requirementCol = [d.category, d.requirement].filter(Boolean).join(" — ");

  // Row for Google Sheets (column order matches the Apps Script / sheet header).
  const sheetRow: Record<string, string> = {
    timestamp: when,
    name: d.name,
    company: d.organisation,
    email: d.email,
    phone: d.phone,
    requirement: requirementCol || (d.market ? `Export: ${d.market}` : ""),
    message: d.message,
    status: "New",
    kind: label,
  };

  // Email body (all submitted details).
  const lines = [
    `New ${label} from the DD Medistock website`,
    `Received: ${when} IST`,
    "",
    `Name:        ${d.name}`,
    `Company:     ${d.organisation}`,
    `Email:       ${d.email}`,
    `Phone:       ${d.phone}`,
    d.market ? `Market:      ${d.market}` : "",
    d.category ? `Category:    ${d.category}` : "",
    d.requirement ? `Requirement: ${d.requirement}` : "",
    "",
    "Message:",
    d.message || "(none)",
  ].filter((l) => l !== "");
  const text = lines.join("\n");
  const html = `<h2 style="font-family:Arial,sans-serif">New ${label}</h2>
<p style="font-family:Arial,sans-serif;color:#475569">Received: ${when} IST</p>
<table style="font-family:Arial,sans-serif;border-collapse:collapse">
  ${[
    ["Name", d.name],
    ["Company", d.organisation],
    ["Email", d.email],
    ["Phone", d.phone],
    ...(d.market ? [["Market", d.market]] : []),
    ...(d.category ? [["Category", d.category]] : []),
    ...(d.requirement ? [["Requirement", d.requirement]] : []),
    ["Message", d.message || "(none)"],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#1F3864;font-weight:bold;vertical-align:top">${k}</td><td style="padding:4px 0">${String(v).replace(/</g, "&lt;")}</td></tr>`,
    )
    .join("")}
</table>`;

  // 1) Try Google Sheets webhook (it also emails the notification address).
  let savedToSheet = false;
  try {
    savedToSheet = await saveToGoogleSheet(sheetRow);
    if (savedToSheet) log.info({ kind: d.kind }, "enquiry.saved_to_sheet");
  } catch (err) {
    log.error({ err }, "enquiry.sheet_failed");
  }

  // 2) Send the email notification ourselves unless the Sheets script handled it.
  if (!savedToSheet) {
    try {
      const r = await sendEmail({ to: NOTIFY_EMAIL, subject: "New Website Enquiry Received", text, html });
      log.info({ kind: d.kind, delivered: r.delivered }, "enquiry.email");
    } catch (err) {
      log.error({ err }, "enquiry.email_failed");
      // Both channels failed — tell the user to reach us directly.
      return NextResponse.json(
        { error: "We could not submit your enquiry right now. Please call or WhatsApp us." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
