// RFQ parsing engine.
//
// Extracts structured line items (product name, brand, quantity, unit,
// technical attributes) from raw RFQ text. Hospitals submit requirement
// sheets in many shapes, so the heuristic parser is tolerant of free text,
// numbered lists, and tabular/CSV rows.
//
// When OPENAI_API_KEY is configured, parseWithLLM() is used for higher-quality
// extraction; otherwise the deterministic heuristic parser runs so the whole
// workflow works offline.

import { extractLineItemsLLM } from "./llm";

export type ParsedLineItem = {
  lineNo: number;
  rawText: string;
  productName: string;
  brand?: string;
  quantity: number;
  unit: string;
  attributes: Record<string, string>;
};

const UNIT_WORDS = [
  "nos", "no", "pcs", "pc", "units", "unit", "box", "boxes", "pack", "packs",
  "set", "sets", "vial", "vials", "bottle", "bottles", "pair", "pairs",
  "roll", "rolls", "strip", "strips", "kit", "kits", "each", "ea",
];

const KNOWN_BRANDS = [
  "bd", "romsons", "hindustan", "polymed", "nipro", "terumo", "3m", "medtronic",
  "philips", "ge", "mindray", "abbott", "siemens", "bbraun", "b.braun", "jmi",
];

/** Detect technical attributes embedded in a product description. */
export function extractAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const t = text.toLowerCase();

  // Volume e.g. 5ml, 10 ml, 0.5ml
  const vol = t.match(/(\d+(?:\.\d+)?)\s?ml\b/);
  if (vol) attrs.volume = `${vol[1]}ml`;

  // Gauge e.g. 22G, 18 g (needles)
  const gauge = t.match(/(\d{2})\s?g\b/);
  if (gauge) attrs.gauge = `${gauge[1]}G`;

  // Size in mm / cm / inch
  const size = t.match(/(\d+(?:\.\d+)?)\s?(mm|cm|inch|in)\b/);
  if (size) attrs.size = `${size[1]}${size[2]}`;

  // Generic small/medium/large
  const sz = t.match(/\b(small|medium|large|xl|xs)\b/);
  if (sz) attrs.size = attrs.size || sz[1];

  // Sterility
  if (/\bsterile\b/.test(t)) attrs.sterility = "Sterile";
  if (/\bnon[- ]?sterile\b/.test(t)) attrs.sterility = "Non-Sterile";

  // Material
  const mat = t.match(/\b(latex|nitrile|vinyl|silicone|pvc|stainless steel|cotton)\b/);
  if (mat) attrs.material = mat[1];

  // Disposable / reusable
  if (/\bdisposable\b/.test(t)) attrs.usage = "Disposable";

  return attrs;
}

function parseQuantity(text: string): { quantity: number; unit: string; cleaned: string } {
  let quantity = 1;
  let unit = "Unit";
  let cleaned = text;

  // Patterns like "x100", "- 100 nos", "qty 50", "100 pcs", trailing "  100"
  const unitGroup = UNIT_WORDS.join("|");
  const re = new RegExp(`(?:qty[:\\s]*)?(?:x\\s*)?(\\d{1,6})\\s*(${unitGroup})?\\b`, "i");

  // Prefer a quantity that appears with a unit, else last standalone number.
  const withUnit = text.match(
    new RegExp(`(\\d{1,6})\\s*(${unitGroup})\\b`, "i"),
  );
  if (withUnit) {
    quantity = parseInt(withUnit[1], 10);
    unit = normalizeUnit(withUnit[2]);
    cleaned = text.replace(withUnit[0], " ");
  } else {
    const m = text.match(re);
    if (m && m[1]) {
      quantity = parseInt(m[1], 10);
      if (m[2]) unit = normalizeUnit(m[2]);
      cleaned = text.replace(m[0], " ");
    }
  }
  return { quantity: quantity || 1, unit, cleaned };
}

function normalizeUnit(u: string): string {
  const map: Record<string, string> = {
    nos: "Nos", no: "Nos", pcs: "Pcs", pc: "Pcs", units: "Unit", unit: "Unit",
    box: "Box", boxes: "Box", pack: "Pack", packs: "Pack", set: "Set",
    sets: "Set", each: "Unit", ea: "Unit",
  };
  return map[u.toLowerCase()] || u.charAt(0).toUpperCase() + u.slice(1).toLowerCase();
}

function detectBrand(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (new RegExp(`\\b${b.replace(".", "\\.")}\\b`).test(lower)) {
      return b.toUpperCase();
    }
  }
  return undefined;
}

function cleanName(text: string): string {
  return text
    .replace(/^[\s\d.)\-•*|]+/, "") // leading bullets / numbering
    .replace(/\b(qty|quantity|brand|spec|specification)s?\b[:\s]*/gi, " ")
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Heuristic, offline RFQ parser. */
export function parseRfqHeuristic(rawText: string): ParsedLineItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedLineItem[] = [];
  let lineNo = 0;

  for (const line of lines) {
    // Skip obvious headers/footers.
    const lower = line.toLowerCase();
    if (
      /^(sr\.?\s*no|s\.?no|item|description|product|qty|quantity|rfq|request|date|to:|from:|subject|dear|regards|thanks)\b/.test(
        lower,
      ) &&
      line.split(/[\s,|]+/).length <= 4
    ) {
      continue;
    }
    if (line.length < 3) continue;

    // CSV / tab / pipe separated rows: take first cell as name, look for qty.
    const cells = line.split(/\s*[|\t]\s*|\s*,\s*(?=\D|\d+\s)/);
    const source = cells.length > 1 ? cells.join(" ") : line;

    const { quantity, unit, cleaned } = parseQuantity(source);
    const attributes = extractAttributes(source);
    const brand = detectBrand(source);
    // For tabular rows, pick the first text-bearing cell as the product name,
    // skipping a leading serial-number column (e.g. "1, IV Cannula, 300").
    let nameSource = cleaned;
    if (cells.length > 1) {
      const textCell = cells.find(
        (c) => !/^\s*\d+\s*$/.test(c) && cleanName(c).length >= 2,
      );
      nameSource = textCell ?? cleaned;
    }
    const productName = cleanName(nameSource);

    if (!productName || productName.length < 2) continue;

    lineNo += 1;
    items.push({
      lineNo,
      rawText: line,
      productName,
      brand,
      quantity,
      unit,
      attributes,
    });
  }

  return items;
}

/**
 * AI-backed parser using LangChain + OpenAI structured output. Falls back to
 * the deterministic heuristic parser when AI is disabled or the call fails, so
 * the RFQ pipeline always produces results.
 */
export async function parseRfqWithLLM(rawText: string): Promise<ParsedLineItem[]> {
  const llmItems = await extractLineItemsLLM(rawText);
  if (!llmItems) return parseRfqHeuristic(rawText);
  return llmItems.map((it, i) => ({
    lineNo: i + 1,
    rawText: it.productName,
    productName: it.productName,
    brand: it.brand ?? undefined,
    quantity: it.quantity,
    unit: it.unit,
    attributes: it.attributes || {},
  }));
}
