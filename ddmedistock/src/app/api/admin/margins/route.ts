import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/api-guards";

const schema = z.object({
  name: z.string().min(1),
  originType: z.enum(["DOMESTIC", "IMPORTED"]).nullable().optional(),
  markupPct: z.coerce.number().min(0),
});

export async function POST(req: Request) {
  const { deny } = await requireStaff();
  if (deny) return deny;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const rule = await prisma.marginRule.create({
    data: { name: parsed.data.name, originType: parsed.data.originType ?? null, markupPct: parsed.data.markupPct },
  });
  return NextResponse.json({ ok: true, id: rule.id });
}

export async function DELETE(req: Request) {
  const { deny } = await requireStaff();
  if (deny) return deny;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.marginRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
