import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, setSession } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { logAuthEvent } from "@/lib/observability/events";
import { clientIp } from "@/lib/security/rate-limit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Login-event tracking: record failures (durable audit + log) for
    // brute-force monitoring. Never log the attempted password.
    logAuthEvent("login_failure", { email, ip });
    await audit(user?.id ?? null, "LOGIN_FAILURE", "User", user?.id, { email, ip });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  await setSession({
    uid: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    organizationId: user.organizationId,
    vendorId: user.vendorId,
  });
  await audit(user.id, "LOGIN", "User", user.id, { ip });
  logAuthEvent("login_success", { userId: user.id, role: user.role, email: user.email, ip });
  return NextResponse.json({ ok: true, role: user.role });
}
