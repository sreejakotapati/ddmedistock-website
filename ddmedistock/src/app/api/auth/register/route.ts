import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { ROLES, VENDOR_STATUS } from "@/lib/constants";
import { audit } from "@/lib/services/audit";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "VENDOR"]),
  organizationName: z.string().optional(),
  organizationType: z.string().optional(),
  originType: z.enum(["DOMESTIC", "IMPORTED"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(d.password);

  if (d.role === ROLES.VENDOR) {
    const vendor = await prisma.vendor.create({
      data: {
        name: d.organizationName || d.name,
        email: d.email,
        originType: d.originType || "DOMESTIC",
        status: VENDOR_STATUS.PENDING,
      },
    });
    const user = await prisma.user.create({
      data: { name: d.name, email: d.email, passwordHash, role: ROLES.VENDOR, vendorId: vendor.id },
    });
    await setSession({ uid: user.id, role: user.role, name: user.name, email: user.email, vendorId: vendor.id });
    await audit(user.id, "REGISTER", "Vendor", vendor.id, {});
    return NextResponse.json({ ok: true, role: user.role });
  }

  // Customer
  const org = await prisma.organization.create({
    data: {
      name: d.organizationName || `${d.name}'s Organization`,
      type: d.organizationType || "HOSPITAL",
    },
  });
  const user = await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash, role: ROLES.CUSTOMER, organizationId: org.id },
  });
  await setSession({ uid: user.id, role: user.role, name: user.name, email: user.email, organizationId: org.id });
  await audit(user.id, "REGISTER", "User", user.id, {});
  return NextResponse.json({ ok: true, role: user.role });
}
