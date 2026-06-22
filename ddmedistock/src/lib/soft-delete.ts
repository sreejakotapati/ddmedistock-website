// Soft-delete helpers.
//
// The models Organization, User, Vendor, and Product carry a nullable
// `deletedAt` column. Rather than physically removing rows (which would break
// audit trails, quotations, and referential history), we mark them deleted and
// filter them out of normal reads. These helpers keep that consistent.

import { prisma } from "@/lib/db";

/** Prisma `where` fragment that excludes soft-deleted rows. */
export const notDeleted = { deletedAt: null } as const;

/** Merge `deletedAt: null` into an existing where clause. */
export function activeWhere<T extends Record<string, unknown>>(where?: T): T & { deletedAt: null } {
  return { ...(where ?? ({} as T)), deletedAt: null };
}

type SoftDeletableModel = "organization" | "user" | "vendor" | "product";

/** Mark a row deleted (idempotent). Returns the updated row. */
export function softDelete(model: SoftDeletableModel, id: string) {
  // @ts-expect-error — dynamic model access is intentional and type-safe at call sites.
  return prisma[model].update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Restore a soft-deleted row. */
export function restore(model: SoftDeletableModel, id: string) {
  // @ts-expect-error — dynamic model access is intentional and type-safe at call sites.
  return prisma[model].update({ where: { id }, data: { deletedAt: null } });
}
