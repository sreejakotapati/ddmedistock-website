import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/api-guards";
import { audit } from "@/lib/services/audit";
import { embedProduct } from "@/lib/services/catalog-ai";
import { invalidate } from "@/lib/cache";

const schema = z.object({
  name: z.string().min(2),
  brand: z.string().optional(),
  category: z.string().optional(),
  originType: z.enum(["DOMESTIC", "IMPORTED"]).default("DOMESTIC"),
  uom: z.string().default("Unit"),
  attributes: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
});

export async function POST(req: Request) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  let categoryId: string | undefined;
  if (d.category) {
    const cat = await prisma.category.upsert({
      where: { name: d.category }, update: {}, create: { name: d.category },
    });
    categoryId = cat.id;
  }

  const searchText = [d.name, d.brand, d.category, ...d.attributes.map((a) => `${a.key} ${a.value}`)]
    .filter(Boolean).join(" ").toLowerCase();

  const product = await prisma.product.create({
    data: {
      name: d.name, brand: d.brand, originType: d.originType, uom: d.uom,
      categoryId, searchText,
      attributes: { create: d.attributes },
    },
  });
  await audit(user!.id, "PRODUCT_CREATED", "Product", product.id, {});
  // Best-effort semantic indexing (no-op when AI is disabled).
  await embedProduct(product.id).catch(() => {});
  // New product → drop stale cached catalog pages.
  await invalidate("catalog:").catch(() => {});
  return NextResponse.json({ ok: true, id: product.id });
}
