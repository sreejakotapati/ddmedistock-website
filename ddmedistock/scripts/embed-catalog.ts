// CLI: backfill product embeddings for semantic search.
//   npm run ai:embed          → embed only products missing a vector
//   npm run ai:embed -- --all → re-embed the entire catalog
//
// Requires OPENAI_API_KEY. Without it the command exits cleanly with a notice.

import { reindexCatalog } from "../src/lib/services/catalog-ai";
import { isAIEnabled } from "../src/lib/ai/llm";
import { prisma } from "../src/lib/db";

async function main() {
  if (!isAIEnabled()) {
    console.log("⚠️  OPENAI_API_KEY not set — semantic search disabled. Nothing to embed.");
    return;
  }
  const all = process.argv.includes("--all");
  console.log(`🧠 Embedding catalog (${all ? "all products" : "missing only"})…`);
  const { embedded } = await reindexCatalog(!all);
  console.log(`✅ Embedded ${embedded} product(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
