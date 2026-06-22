import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/api-guards";
import { hashPassword } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { audit } from "@/lib/services/audit";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "PROCUREMENT_MANAGER", "SUPER_ADMIN"]),
});

const updateSchema = z.object({
  id: z.string(),
  role: z.enum(["ADMIN", "PROCUREMENT_MANAGER", "SUPER_ADMIN"]),
});

// Create a staff user.
export async function POST(req: Request) {
  const { user, deny } = await requireSuperAdmin();
  if (deny) return deny;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }
  const created = await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash: await hashPassword(d.password), role: d.role },
  });
  await audit(user!.id, "STAFF_CREATED", "User", created.id, { role: d.role });
  return NextResponse.json({ ok: true, id: created.id });
}

// Change a staff member's role.
export async function PATCH(req: Request) {
  const { user, deny } = await requireSuperAdmin();
  if (deny) return deny;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!target || !STAFF_ROLES.includes(target.role)) {
    return NextResponse.json({ error: "Only staff roles can be changed here" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: parsed.data.id }, data: { role: parsed.data.role } });
  await audit(user!.id, "STAFF_ROLE_CHANGED", "User", parsed.data.id, { role: parsed.data.role });
  return NextResponse.json({ ok: true });
}
