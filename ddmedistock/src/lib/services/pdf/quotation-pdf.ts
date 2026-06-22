// PDF Engine — quotation documents (pdf-lib).
//
// Generates two strictly separated PDFs from a quotation:
//   • Customer PDF  — products, quantities, final prices, customer notes, totals.
//                     NEVER contains cost, margin, vendor, or internal notes.
//   • Internal PDF  — everything above PLUS cost, margin, vendor and the
//                     internal P&L. Admin / Procurement Manager only.
//
// pdf-lib is pure JS (no headless browser), so generation is fast, dependency-
// light, and runs anywhere the app runs. The two builders take *different*
// types — the customer builder cannot even be handed cost data — so a coding
// mistake can't leak internal pricing into the customer document.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// ── Public data contracts ────────────────────────────────────────────────────

export type CustomerItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxPct: number;
};

/** Customer document data. NOTE: intentionally has no cost/margin/vendor fields. */
export type CustomerQuoteData = {
  number: string;
  rfqReference: string;
  date: Date | string;
  organizationName: string;
  customerNotes: string;
  currency: string;
  items: CustomerItem[];
};

export type InternalItem = CustomerItem & {
  unitCost: number;
  marginPct: number;
  vendorName: string | null;
  internalNote: string;
  originType: string;
};

/** Internal document data — superset including sensitive pricing. */
export type InternalQuoteData = {
  number: string;
  rfqReference: string;
  date: Date | string;
  organizationName: string;
  customerNotes: string;
  internalNotes: string;
  currency: string;
  items: InternalItem[];
};

// ── Formatting helpers ───────────────────────────────────────────────────────

// pdf-lib's StandardFonts are WinAnsi-encoded and cannot render U+20B9 (₹), so
// we prefix amounts with the ISO code / "Rs." instead of the glyph.
function money(amount: number, currency = "INR"): string {
  const n = (amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "INR" ? `Rs. ${n}` : `${currency} ${n}`;
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const BRAND = rgb(0.05, 0.30, 0.55);
const MUTED = rgb(0.45, 0.45, 0.45);
const BLACK = rgb(0.1, 0.1, 0.1);
const HEADER_BG = rgb(0.93, 0.95, 0.98);
const AMBER_BG = rgb(0.99, 0.95, 0.86);

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  width: number;
  height: number;
  margin: number;
};

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage([595.28, 841.89]); // A4 portrait
  ctx.y = ctx.height - ctx.margin;
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < ctx.margin + 40) newPage(ctx);
}

function text(ctx: Ctx, s: string, x: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}): void {
  ctx.page.drawText(s, { x, y: ctx.y, size, font: opts.bold ? ctx.bold : ctx.font, color: opts.color ?? BLACK });
}

/** Right-align text ending at x. */
function textRight(ctx: Ctx, s: string, xRight: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}): void {
  const f = opts.bold ? ctx.bold : ctx.font;
  const w = f.widthOfTextAtSize(s, size);
  ctx.page.drawText(s, { x: xRight - w, y: ctx.y, size, font: f, color: opts.color ?? BLACK });
}

/** Truncate a string to fit a column width. */
function clip(font: PDFFont, s: string, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out.length > 1 && font.widthOfTextAtSize(out + "…", size) > maxW) out = out.slice(0, -1);
  return out + "…";
}

async function baseDoc(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  doc.setTitle("DD MediStock Quotation");
  doc.setProducer("DD MediStock");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595.28, 841.89]);
  return { doc, page, font, bold, y: 841.89 - 48, width: 595.28, height: 841.89, margin: 48 };
}

function header(ctx: Ctx, docLabel: string, q: { number: string; rfqReference: string; date: Date | string; organizationName: string }, confidential: boolean): void {
  text(ctx, "DD MediStock", ctx.margin, 22, { bold: true, color: BRAND });
  ctx.y -= 16;
  text(ctx, "Medical, Dental & Lab Supplies — Chennai", ctx.margin, 9, { color: MUTED });
  // Document label, right side
  textRight(ctx, docLabel, ctx.width - ctx.margin, 14, { bold: true, color: confidential ? rgb(0.7, 0.2, 0.1) : BRAND });

  ctx.y -= 26;
  ctx.page.drawLine({ start: { x: ctx.margin, y: ctx.y + 8 }, end: { x: ctx.width - ctx.margin, y: ctx.y + 8 }, thickness: 1, color: BRAND });
  ctx.y -= 6;

  // Meta block
  text(ctx, `Quotation: ${q.number}`, ctx.margin, 10, { bold: true });
  textRight(ctx, `Date: ${fmtDate(q.date)}`, ctx.width - ctx.margin, 10);
  ctx.y -= 14;
  text(ctx, `RFQ Ref: ${q.rfqReference}`, ctx.margin, 10);
  ctx.y -= 14;
  text(ctx, `Customer: ${q.organizationName}`, ctx.margin, 10);
  ctx.y -= 18;

  if (confidential) {
    ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 4, width: ctx.width - 2 * ctx.margin, height: 18, color: AMBER_BG });
    text(ctx, "INTERNAL — CONFIDENTIAL. Contains cost, margin & vendor data. Not for customer distribution.", ctx.margin + 6, 8.5, { bold: true, color: rgb(0.6, 0.35, 0.05) });
    ctx.y -= 24;
  }
}

function footer(ctx: Ctx): void {
  const pages = ctx.doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`DD MediStock · Page ${i + 1} of ${pages.length}`, {
      x: ctx.margin, y: 28, size: 8, font: ctx.font, color: MUTED,
    });
  });
}

// ── Customer PDF ─────────────────────────────────────────────────────────────

export async function buildCustomerQuotePdf(q: CustomerQuoteData): Promise<Uint8Array> {
  const ctx = await baseDoc();
  header(ctx, "QUOTATION", q, false);

  // Columns: Product | Qty | Unit | Unit Price | Line Total
  const x = { desc: ctx.margin, qty: 330, unit: 380, price: 470, total: ctx.width - ctx.margin };
  drawTableHeader(ctx, [
    ["Product", x.desc, "left"], ["Qty", x.qty, "left"], ["Unit", x.unit, "left"],
    ["Unit Price", x.price, "right"], ["Line Total", x.total, "right"],
  ]);

  let subtotal = 0, tax = 0;
  for (const it of q.items) {
    ensureSpace(ctx, 18);
    const line = it.quantity * it.unitPrice;
    subtotal += line;
    tax += (line * it.taxPct) / 100;
    text(ctx, clip(ctx.font, it.description, 9, x.qty - x.desc - 8), x.desc, 9);
    text(ctx, String(it.quantity), x.qty, 9);
    text(ctx, it.unit, x.unit, 9);
    textRight(ctx, money(it.unitPrice, q.currency), x.price, 9);
    textRight(ctx, money(line, q.currency), x.total, 9);
    ctx.y -= 16;
  }
  rowLine(ctx);

  totalsBlock(ctx, q.currency, [
    ["Subtotal", subtotal], ["Tax", tax], ["Total", subtotal + tax],
  ]);

  notesBlock(ctx, "Notes", q.customerNotes);
  footer(ctx);
  return ctx.doc.save();
}

// ── Internal PDF ─────────────────────────────────────────────────────────────

export async function buildInternalQuotePdf(q: InternalQuoteData): Promise<Uint8Array> {
  const ctx = await baseDoc();
  header(ctx, "INTERNAL QUOTE", q, true);

  // Compact columns to fit cost/margin/vendor.
  const x = {
    desc: ctx.margin, qty: 196, cost: 238, margin: 300, price: 350,
    vendor: 410, total: ctx.width - ctx.margin,
  };
  drawTableHeader(ctx, [
    ["Product", x.desc, "left"], ["Qty", x.qty, "left"], ["Cost", x.cost, "right"],
    ["Mgn%", x.margin, "right"], ["Price", x.price, "right"], ["Vendor", x.vendor, "left"],
    ["Total", x.total, "right"],
  ]);

  let revenue = 0, cost = 0, tax = 0;
  for (const it of q.items) {
    ensureSpace(ctx, 26);
    const line = it.quantity * it.unitPrice;
    revenue += line;
    cost += it.quantity * it.unitCost;
    tax += (line * it.taxPct) / 100;
    text(ctx, clip(ctx.font, it.description, 8, x.qty - x.desc - 6), x.desc, 8);
    text(ctx, String(it.quantity), x.qty, 8);
    textRight(ctx, money(it.unitCost, q.currency), x.cost, 8);
    textRight(ctx, `${it.marginPct}%`, x.margin, 8);
    textRight(ctx, money(it.unitPrice, q.currency), x.price, 8);
    text(ctx, clip(ctx.font, it.vendorName ?? "—", 8, x.total - x.vendor - 50), x.vendor, 8);
    textRight(ctx, money(line, q.currency), x.total, 8);
    ctx.y -= 12;
    if (it.internalNote) {
      text(ctx, clip(ctx.font, `  - ${it.internalNote}`, 7, x.total - x.desc), x.desc, 7, { color: MUTED });
      ctx.y -= 11;
    }
  }
  rowLine(ctx);

  const profit = revenue - cost;
  const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
  totalsBlock(ctx, q.currency, [
    ["Revenue", revenue], ["Cost of goods", cost], ["Profit", profit],
    ["Tax", tax], ["Grand total", revenue + tax],
  ]);
  ctx.y -= 4;
  text(ctx, `Blended margin: ${marginPct}%`, ctx.margin, 9, { bold: true, color: BRAND });
  ctx.y -= 18;

  notesBlock(ctx, "Customer notes", q.customerNotes);
  notesBlock(ctx, "Internal notes (admin-only)", q.internalNotes);
  footer(ctx);
  return ctx.doc.save();
}

// ── Shared drawing primitives ────────────────────────────────────────────────

function drawTableHeader(ctx: Ctx, cols: [string, number, "left" | "right"][]): void {
  ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 4, width: ctx.width - 2 * ctx.margin, height: 16, color: HEADER_BG });
  for (const [label, xpos, align] of cols) {
    if (align === "right") textRight(ctx, label, xpos, 9, { bold: true, color: BRAND });
    else text(ctx, label, xpos, 9, { bold: true, color: BRAND });
  }
  ctx.y -= 20;
}

function rowLine(ctx: Ctx): void {
  ctx.page.drawLine({ start: { x: ctx.margin, y: ctx.y + 6 }, end: { x: ctx.width - ctx.margin, y: ctx.y + 6 }, thickness: 0.7, color: rgb(0.8, 0.8, 0.8) });
  ctx.y -= 8;
}

function totalsBlock(ctx: Ctx, currency: string, rows: [string, number][]): void {
  for (const [label, val] of rows) {
    ensureSpace(ctx, 16);
    const strong = /total|profit/i.test(label);
    textRight(ctx, label, ctx.width - ctx.margin - 130, 10, { bold: strong });
    textRight(ctx, money(val, currency), ctx.width - ctx.margin, 10, { bold: strong });
    ctx.y -= 15;
  }
}

function notesBlock(ctx: Ctx, title: string, body: string): void {
  if (!body?.trim()) return;
  ensureSpace(ctx, 40);
  ctx.y -= 6;
  text(ctx, title, ctx.margin, 10, { bold: true, color: BRAND });
  ctx.y -= 14;
  // naive word-wrap
  const maxW = ctx.width - 2 * ctx.margin;
  let lineStr = "";
  for (const word of body.split(/\s+/)) {
    const test = lineStr ? `${lineStr} ${word}` : word;
    if (ctx.font.widthOfTextAtSize(test, 9) > maxW) {
      ensureSpace(ctx, 14);
      text(ctx, lineStr, ctx.margin, 9);
      ctx.y -= 12;
      lineStr = word;
    } else {
      lineStr = test;
    }
  }
  if (lineStr) { text(ctx, lineStr, ctx.margin, 9); ctx.y -= 12; }
}
