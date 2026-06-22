import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/api-guards";
import { ROLES } from "@/lib/constants";
import { audit } from "@/lib/services/audit";

const schema = z.object({
  cdscoLicense: z.string().optional(),
  isoCert: z.string().optional(),
  importCert: z.string().optional(),
});

export async function POST(req: Request) {
  const { user, deny } = await requireRole(ROLES.VENDOR);
  if (deny) return deny;
  if (!user!.vendorId) return NextResponse.json({ error: "No vendor profile" }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.vendor.update({ where: { id: user!.vendorId }, data: parsed.data });
  await audit(user!.id, "VENDOR_COMPLIANCE_UPDATED", "Vendor", user!.vendorId, {});
  return NextResponse.json({ ok: true });
}
