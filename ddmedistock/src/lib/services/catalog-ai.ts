// Catalog embedding maintenance.
//
// Generates and stores OpenAI embeddings for products so the matching engine
// can do semantic vector search. No-ops gracefully when AI is disabled.

import { prisma } from "@/lib/db";
import { embedTexts, isAIEnabled } from "@/lib/ai/llm";

/** Canonical text representation of a product used for embedding. */
export function productEmbedText(p: {
  name: string;
  brand: string | null;
  description: string | null;
  attributes: { key: string; value: string }[];
}): string {
  const attrs = p.attributes.map((a) => `${a.key}: ${a.value}`).join(", ");
  return [p.name, p.brand, p.description, attrs].filter(Boolean).join(" — ");
}

/**
 * Persist a product's embedding in both forms: the portable JSON column
 * (Product.embedding) and the native pgvector column (embedding_vec) that
 * backs the HNSW ANN index. The vector write is best-effort so the function
 * still succeeds on databases without pgvector.
 */
async function persistEmbedding(productId: string, vector: number[]): Promise<void> {
  const json = JSON.stringify(vector);
  await prisma.product.update({ where: { id: productId }, data: { embedding: json } });
  try {
    // `[1,2,3]` JSON text casts directly to pgvector's literal format.
    await prisma.$executeRaw`UPDATE "Product" SET "embedding_vec" = ${json}::vector WHERE "id" = ${productId}`;
  } catch {
    // pgvector unavailable (e.g. non-Postgres dev) — JSON column is enough.
  }
}

/**
 * Embed products in batches and persist the vectors (JSON + native vector).
 * @param onlyMissing when true (default) skips products that already have one.
 * @returns number of products embedded.
 */
export async function reindexCatalog(onlyMissing = true): Promise<{ embedded: number; skipped: boolean }> {
  if (!isAIEnabled()) return { embedded: 0, skipped: true };

  const products = await prisma.product.findMany({
    where: onlyMissing
      ? { embedding: null, active: true, deletedAt: null }
      : { active: true, deletedAt: null },
    include: { attributes: true },
  });
  if (products.length === 0) return { embedded: 0, skipped: false };

  let embedded = 0;
  const BATCH = 64;
  for (let i = 0; i < products.length; i += BATCH) {
    const slice = products.slice(i, i + BATCH);
    const vectors = await embedTexts(slice.map((p) => productEmbedText(p)));
    if (!vectors) break; // AI failed — stop, leave remaining unembedded
    await Promise.all(slice.map((p, j) => persistEmbedding(p.id, vectors[j])));
    embedded += slice.length;
  }
  return { embedded, skipped: false };
}

/** Embed a single product (best-effort, used on create/update). */
export async function embedProduct(productId: string): Promise<boolean> {
  if (!isAIEnabled()) return false;
  const p = await prisma.product.findUnique({ where: { id: productId }, include: { attributes: true } });
  if (!p) return false;
  const vectors = await embedTexts([productEmbedText(p)]);
  if (!vectors) return false;
  await persistEmbedding(productId, vectors[0]);
  return true;
}

/**
 * Native pgvector ANN search: returns the top-K product IDs nearest to the
 * query embedding by cosine distance, using the HNSW index. Returns null when
 * pgvector is unavailable so callers can fall back to in-app cosine scoring.
 */
export async function semanticSearchIds(
  queryEmbedding: number[],
  k = 20,
): Promise<{ id: string; distance: number }[] | null> {
  try {
    const literal = JSON.stringify(queryEmbedding);
    return await prisma.$queryRaw<{ id: string; distance: number }[]>`
      SELECT "id", ("embedding_vec" <=> ${literal}::vector) AS distance
      FROM "Product"
      WHERE "embedding_vec" IS NOT NULL AND "active" = true AND "deletedAt" IS NULL
      ORDER BY "embedding_vec" <=> ${literal}::vector
      LIMIT ${k}`;
  } catch {
    return null;
  }
}
