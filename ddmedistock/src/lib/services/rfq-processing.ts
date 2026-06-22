// RFQ processing orchestration:
//  1. Parse raw RFQ text into line items (AI / heuristic).
//  2. Run the hybrid matching engine for each line item.
//  3. Persist line items + ranked product matches.
//  4. Auto-select the top match per line.
//  5. Advance RFQ status to MATCHING_COMPLETED.

import { prisma } from "@/lib/db";
import { parseRfqWithLLM, type ParsedLineItem } from "@/lib/ai/parser";
import { matchLineItem, type CatalogProduct } from "@/lib/ai/matching";
import { embedText } from "@/lib/ai/llm";
import { RFQ_STATUS } from "@/lib/constants";
import { audit } from "./audit";
import { notifyRfqProcessed } from "./notifications";

function parseEmbedding(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as number[]) : null;
  } catch {
    return null;
  }
}

async function loadCatalog(): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { attributes: true },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    description: p.description,
    originType: p.originType,
    searchText: p.searchText,
    embedding: parseEmbedding(p.embedding),
    attributes: p.attributes.map((a) => ({ key: a.key, value: a.value })),
  }));
}

/** Build the text we embed for a line item (name + brand + specs). */
function lineItemEmbedText(item: ParsedLineItem): string {
  const attrs = Object.entries(item.attributes || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return [item.productName, item.brand, attrs].filter(Boolean).join(" — ");
}

export async function processRfq(rfqId: string, actorId?: string) {
  const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
  if (!rfq) throw new Error("RFQ not found");

  // Reset any prior processing (idempotent re-run).
  await prisma.rFQLineItem.deleteMany({ where: { rfqId } });

  const parsed = await parseRfqWithLLM(rfq.rawText);
  const catalog = await loadCatalog();

  // Does the catalog have embeddings? If so, use semantic vector search.
  const catalogHasVectors = catalog.some((p) => p.embedding && p.embedding.length);

  for (const item of parsed) {
    const queryEmbedding = catalogHasVectors ? await embedText(lineItemEmbedText(item)) : null;
    const matches = matchLineItem(item, catalog, 5, 8, queryEmbedding);
    await prisma.rFQLineItem.create({
      data: {
        rfqId,
        lineNo: item.lineNo,
        rawText: item.rawText,
        productName: item.productName,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        attributes: item.attributes as object,
        matches: {
          create: matches.map((m, idx) => ({
            productId: m.productId,
            score: m.score,
            matchType: m.matchType,
            rank: idx + 1,
            isSelected: idx === 0, // auto-select best match for admin review
            reason: m.reason,
          })),
        },
      },
    });
  }

  await prisma.rFQ.update({
    where: { id: rfqId },
    data: { status: RFQ_STATUS.MATCHING_COMPLETED },
  });

  await audit(actorId ?? null, "RFQ_PROCESSED", "RFQ", rfqId, {
    lineItems: parsed.length,
  });

  // Alert staff (in-app + email) that the RFQ is ready for review.
  await notifyRfqProcessed(rfqId);

  return { lineItems: parsed.length };
}
