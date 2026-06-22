import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-guards";
import { reindexCatalog } from "@/lib/services/catalog-ai";
import { isAIEnabled } from "@/lib/ai/llm";
import { audit } from "@/lib/services/audit";

// Trigger a catalog embedding backfill for semantic search.
export async function POST(req: Request) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;

  if (!isAIEnabled()) {
    return NextResponse.json(
      { ok: false, error: "AI is disabled. Set OPENAI_API_KEY to enable semantic search." },
      { status: 400 },
    );
  }

  const all = new URL(req.url).searchParams.get("all") === "1";
  const result = await reindexCatalog(!all);
  await audit(user!.id, "CATALOG_REINDEXED", "Product", undefined, result);
  return NextResponse.json({ ok: true, ...result });
}
