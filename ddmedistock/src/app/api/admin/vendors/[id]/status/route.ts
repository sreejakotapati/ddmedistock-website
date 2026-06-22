import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/api-guards";
import { audit } from "@/lib/services/audit";

const schema = z.object({ status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await requireStaff();
  if (deny) return deny;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.vendor.update({ where: { id }, data: { status: parsed.data.status } });
  await audit(user!.id, "VENDOR_STATUS", "Vendor", id, { status: parsed.data.status });
  return NextResponse.json({ ok: true });
}
