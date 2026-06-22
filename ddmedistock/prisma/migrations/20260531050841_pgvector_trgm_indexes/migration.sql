-- Production semantic + fuzzy search infrastructure.
--
-- Prisma stores Product.embedding as TEXT (a JSON-encoded float[]) so the
-- schema stays provider-portable and the app keeps working without a vector
-- store. This migration adds a *native* pgvector column alongside it plus the
-- ANN and trigram indexes that make search fast at scale. The application
-- backfills `embedding_vec` from `embedding` (see scripts/embed-catalog.ts).

-- 1. Native vector column for ANN search (text-embedding-3-small = 1536 dims).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "embedding_vec" vector(1536);

-- 2. HNSW index for fast approximate nearest-neighbour cosine search.
--    cosine distance (<=>) matches how we score semantic similarity.
CREATE INDEX IF NOT EXISTS "Product_embedding_vec_hnsw_idx"
  ON "Product" USING hnsw ("embedding_vec" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. GIN trigram index for fuzzy / typo-tolerant text search on the
--    denormalized search blob and the product name.
CREATE INDEX IF NOT EXISTS "Product_searchText_trgm_idx"
  ON "Product" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING gin ("name" gin_trgm_ops);
