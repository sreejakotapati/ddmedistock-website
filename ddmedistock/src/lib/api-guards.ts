import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { STAFF_ROLES, ROLES } from "./constants";

/** Returns the user if they hold one of the roles, else a NextResponse to return early. */
export async function requireRole(roles: string | string[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await getCurrentUser();
  if (!user) return { user: null, deny: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!allowed.includes(user.role)) return { user: null, deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user, deny: null as NextResponse | null };
}

/** Any back-office staff role (Admin, Procurement Manager, Super Admin). */
export const requireStaff = () => requireRole(STAFF_ROLES);

/** Super Admin only (user & role management). */
export const requireSuperAdmin = () => requireRole(ROLES.SUPER_ADMIN);
