// Edge-safe JWT helpers (jose only — no bcrypt/prisma/node APIs), so this can
// be imported from middleware running on the Edge runtime.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ddms_session";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "ddmedistock-dev-secret-change-me",
);

export type SessionPayload = {
  uid: string;
  role: string;
  name: string;
  email: string;
  organizationId?: string | null;
  vendorId?: string | null;
};

export async function signToken(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
