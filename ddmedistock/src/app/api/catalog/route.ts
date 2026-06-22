import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePageParams, paginate } from "@/lib/pagination";
import { cached } from "@/lib/cache";

// Public-to-authenticated product search. Returns specs but NEVER pricing,
// cost, or supplier data — consistent with the "no public pricing" principle.
// Paginated and cached (short TTL) since the catalog changes infrequently.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const p = parsePageParams(url.searchParams, { defaultPageSize: 24 });

  const where = q
    ? {
        active: true,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { brand: { contains: q, mode: "insensitive" as const } },
          { searchText: { contains: q.toLowerCase() } },
        ],
      }
    : { active: true, deletedAt: null };

  // Cache each page for 60s keyed by query + page (short TTL: the catalog is
  // fairly static, and product writes invalidate the "catalog:" namespace).
  const cacheKey = `catalog:${q}:${p.page}:${p.pageSize}`;
  const payload = await cached(cacheKey, 60, async () => {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, attributes: true },
        skip: p.skip,
        take: p.take,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      uom: row.uom,
      originType: row.originType,
      category: row.category?.name ?? null,
      attributes: row.attributes.map((a) => ({ key: a.key, value: a.value })),
    }));
    return paginate(items, total, p);
  });

  // Keep the legacy `products` key for existing callers; add pagination meta.
  return NextResponse.json({ products: payload.items, ...payload });
}
