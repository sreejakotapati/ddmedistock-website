import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/api-guards";
import { QUOTATION_STATUS } from "@/lib/constants";
import { audit } from "@/lib/services/audit";

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unit: z.string().default("Unit"),
  unitCost: z.coerce.number().min(0).default(0),
  marginPct: z.coerce.number().default(0),
  unitPrice: z.coerce.number().min(0).default(0),
  taxPct: z.coerce.number().min(0).default(12),
  leadTimeDays: z.coerce.number().int().min(0).default(7),
  originType: z.enum(["DOMESTIC", "IMPORTED"]).default("DOMESTIC"),
  vendorName: z.string().nullable().optional(),
  internalNote: z.string().default(""),
  productId: z.string().nullable().optional(),
});

const schema = z.object({
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  taxPct: z.coerce.number().optional(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL"]).optional(),
  items: z.array(itemSchema),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === QUOTATION_STATUS.PUBLISHED) {
    return NextResponse.json({ error: "Published quotations cannot be edited. Create a new version." }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  // Replace items wholesale — simplest reliable strategy for the editor.
  await prisma.$transaction([
    prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
    prisma.quotation.update({
      where: { id },
      data: {
        customerNotes: d.customerNotes ?? existing.customerNotes,
        internalNotes: d.internalNotes ?? existing.internalNotes,
        taxPct: d.taxPct ?? existing.taxPct,
        status: d.status ?? existing.status,
        items: {
          create: d.items.map((it, idx) => ({
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            unitCost: it.unitCost,
            marginPct: it.marginPct,
            unitPrice: it.unitPrice,
            taxPct: it.taxPct,
            leadTimeDays: it.leadTimeDays,
            originType: it.originType,
            vendorName: it.vendorName ?? null,
            internalNote: it.internalNote,
            productId: it.productId ?? null,
            sortOrder: idx,
          })),
        },
      },
    }),
  ]);

  await audit(user!.id, "QUOTATION_EDITED", "Quotation", id, { items: d.items.length });
  return NextResponse.json({ ok: true });
}
