import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/api-guards";
import { ROLES } from "@/lib/constants";
import { audit } from "@/lib/services/audit";

const schema = z.object({
  name: z.string().min(2),
  brand: z.string().optional(),
  category: z.string().optional(),
  attributes: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  cost: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  leadTimeDays: z.coerce.number().int().min(0).default(7),
  sku: z.string().optional(),
});

export async function POST(req: Request) {
  const { user, deny } = await requireRole(ROLES.VENDOR);
  if (deny) return deny;
  if (!user!.vendorId) return NextResponse.json({ error: "No vendor profile" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  const vendor = await prisma.vendor.findUnique({ where: { id: user!.vendorId } });

  // Find an existing catalog product by name+brand, else create one.
  let product = await prisma.product.findFirst({ where: { name: d.name, brand: d.brand ?? null } });
  if (!product) {
    let categoryId: string | undefined;
    if (d.category) {
      const cat = await prisma.category.upsert({ where: { name: d.category }, update: {}, create: { name: d.category } });
      categoryId = cat.id;
    }
    const searchText = [d.name, d.brand, d.category, ...d.attributes.map((a) => `${a.key} ${a.value}`)]
      .filter(Boolean).join(" ").toLowerCase();
    product = await prisma.product.create({
      data: {
        name: d.name, brand: d.brand, categoryId, originType: vendor?.originType ?? "DOMESTIC",
        searchText, attributes: { create: d.attributes },
      },
    });
  }

  const vp = await prisma.vendorProduct.upsert({
    where: { vendorId_productId: { vendorId: user!.vendorId, productId: product.id } },
    update: { stock: d.stock, leadTimeDays: d.leadTimeDays, sku: d.sku },
    create: { vendorId: user!.vendorId, productId: product.id, stock: d.stock, leadTimeDays: d.leadTimeDays, sku: d.sku },
  });

  await prisma.vendorCost.create({ data: { vendorProductId: vp.id, cost: d.cost } });
  await audit(user!.id, "VENDOR_PRODUCT_ADDED", "VendorProduct", vp.id, { productId: product.id });

  return NextResponse.json({ ok: true });
}
