import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/api-guards";
import { audit } from "@/lib/services/audit";

const schema = z.object({ lineItemId: z.string(), productId: z.string() });

export async function POST(req: Request) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { lineItemId, productId } = parsed.data;

  await prisma.$transaction([
    prisma.productMatch.updateMany({ where: { lineItemId }, data: { isSelected: false } }),
    prisma.productMatch.updateMany({ where: { lineItemId, productId }, data: { isSelected: true } }),
  ]);

  await audit(user!.id, "MATCH_SELECTED", "RFQLineItem", lineItemId, { productId });
  return NextResponse.json({ ok: true });
}
