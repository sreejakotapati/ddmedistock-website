import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";
import {
  signToken, verifyToken, SESSION_COOKIE, type SessionPayload,
} from "./jwt";

export type { SessionPayload };
export { signToken, verifyToken, SESSION_COOKIE };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function setSession(payload: SessionPayload) {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the current session payload (cheap, from cookie) or null. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Loads the full user record for the current session. */
export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({
    where: { id: s.uid },
    include: { organization: true, vendor: true },
  });
}
