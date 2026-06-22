import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import {
  buildCustomerQuotePdf,
  buildInternalQuotePdf,
  type CustomerQuoteData,
  type InternalQuoteData,
} from "../src/lib/services/pdf/quotation-pdf";

const SENSITIVE = {
  // Vendor name kept realistically short so it isn't clipped by the internal
  // table's Vendor column (the PDF truncates over-long cell text with an
  // ellipsis — correct rendering behaviour, not a data guarantee).
  vendor: "SecretCo",
  itemNote: "SECRET_ITEM_NOTE",
  internalNote: "SECRET_INTERNAL_NOTE",
  costFragment: "7.77", // unitCost 7.77777
};

const internalData: InternalQuoteData = {
  number: "QT-2026-TEST",
  rfqReference: "RFQ-2026-XYZ",
  date: new Date("2026-05-31"),
  organizationName: "City Hospital",
  customerNotes: "Delivery within 7 days.",
  internalNotes: SENSITIVE.internalNote,
  currency: "INR",
  items: [
    {
      description: "Disposable Syringe 5ml",
      quantity: 100,
      unit: "Nos",
      unitPrice: 12.5,
      taxPct: 12,
      unitCost: 7.77777,
      marginPct: 60,
      vendorName: SENSITIVE.vendor,
      internalNote: SENSITIVE.itemNote,
      originType: "DOMESTIC",
    },
  ],
};

const customerData: CustomerQuoteData = {
  number: internalData.number,
  rfqReference: internalData.rfqReference,
  date: internalData.date,
  organizationName: internalData.organizationName,
  customerNotes: internalData.customerNotes,
  currency: internalData.currency,
  items: internalData.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    unitPrice: it.unitPrice,
    taxPct: it.taxPct,
  })),
};

/**
 * Extract the rendered text from a pdf-lib PDF. pdf-lib Flate-compresses each
 * content stream and emits drawn text as hex strings, e.g. `<4444...> Tj`. We
 * inflate every `stream…endstream` block, then decode the operands of every
 * `Tj`/`TJ` text-showing operator (both hex `<..>` and literal `(..)` forms).
 * This asserts on what the PDF actually renders, not just raw file bytes.
 */
function extractText(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  let content = "";
  let idx = 0;
  const S = Buffer.from("stream");
  const E = Buffer.from("endstream");
  while (true) {
    const s = buf.indexOf(S, idx);
    if (s === -1) break;
    let d = s + S.length;
    if (buf[d] === 0x0d) d++;
    if (buf[d] === 0x0a) d++;
    const e = buf.indexOf(E, d);
    if (e === -1) break;
    const chunk = buf.subarray(d, e);
    try {
      content += inflateSync(chunk).toString("latin1") + "\n";
    } catch {
      content += chunk.toString("latin1") + "\n"; // uncompressed
    }
    idx = e + E.length;
  }

  let out = "";
  // Hex strings: <48656C6C6F> Tj  — decode pairs of hex digits to chars.
  for (const m of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
    const hex = m[1].replace(/\s+/g, "");
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    out += " ";
  }
  // Literal strings: (Hello) Tj
  for (const m of content.matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)) {
    out += m[1].replace(/\\([()\\])/g, "$1") + " ";
  }
  return out;
}

test("customer PDF is a valid, non-empty PDF", async () => {
  const bytes = await buildCustomerQuotePdf(customerData);
  assert.ok(bytes.length > 800);
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
});

test("customer PDF renders product, price and customer notes", async () => {
  const txt = extractText(await buildCustomerQuotePdf(customerData));
  assert.ok(txt.includes("Syringe"), "product missing from rendered PDF");
  assert.ok(txt.includes("Delivery within 7 days"), "customer notes missing");
});

test("customer PDF NEVER renders cost, margin, vendor or internal notes", async () => {
  const txt = extractText(await buildCustomerQuotePdf(customerData));
  assert.ok(!txt.includes(SENSITIVE.vendor), "vendor name leaked");
  assert.ok(!txt.includes(SENSITIVE.itemNote), "item internal note leaked");
  assert.ok(!txt.includes(SENSITIVE.internalNote), "internal notes leaked");
  assert.ok(!txt.includes(SENSITIVE.costFragment), "unit cost leaked");
  assert.ok(!txt.includes("Cost of goods"), "P&L cost row leaked");
  assert.ok(!txt.includes("Profit"), "P&L profit row leaked");
  assert.ok(!txt.includes("Vendor"), "vendor column header leaked");
});

test("internal PDF renders cost, vendor, internal notes and P&L", async () => {
  const txt = extractText(await buildInternalQuotePdf(internalData));
  assert.ok(txt.includes(SENSITIVE.vendor), "vendor missing from internal PDF");
  assert.ok(txt.includes(SENSITIVE.itemNote), "item note missing from internal PDF");
  assert.ok(txt.includes("Cost of goods"), "P&L missing from internal PDF");
  assert.ok(txt.includes("CONFIDENTIAL"), "confidential banner missing");
});
