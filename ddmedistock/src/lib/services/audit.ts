import { prisma } from "@/lib/db";

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  meta: Record<string, unknown> = {},
) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? undefined, action, entity, entityId, meta: meta as object },
    });
  } catch {
    // auditing must never break the main flow
  }
}

export async function notify(
  userId: string,
  title: string,
  body: string,
  link?: string,
  type = "INFO",
) {
  try {
    await prisma.notification.create({ data: { userId, title, body, link, type } });
  } catch {
    /* ignore */
  }
}
