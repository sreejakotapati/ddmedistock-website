// Workflow & approval history.
//
// Records every validated state transition and approval decision against the
// AuditLog table (entity = "RFQ" | "Quotation", action = "WORKFLOW_TRANSITION"
// | "APPROVAL_DECISION"). This gives a queryable, compliance-grade history of
// who moved what, when, and why — without a schema migration.

import { prisma } from "@/lib/db";
import { audit } from "./audit";
import { assertTransition, type WorkflowKind } from "@/lib/workflow";

export const WORKFLOW_ACTION = "WORKFLOW_TRANSITION";
export const APPROVAL_ACTION = "APPROVAL_DECISION";

/**
 * Validate `from → to`, persist the entity's new status, and log the move.
 * Throws InvalidTransitionError (from assertTransition) on an illegal change,
 * so callers never silently corrupt workflow state.
 */
export async function transition(opts: {
  kind: WorkflowKind;
  entityId: string;
  from: string;
  to: string;
  actorId?: string | null;
  note?: string;
}): Promise<void> {
  const { kind, entityId, from, to, actorId, note } = opts;
  assertTransition(kind, from, to);
  if (from === to) return; // no-op, nothing to record

  if (kind === "RFQ") {
    await prisma.rFQ.update({ where: { id: entityId }, data: { status: to } });
  } else {
    await prisma.quotation.update({ where: { id: entityId }, data: { status: to } });
  }

  await audit(actorId ?? null, WORKFLOW_ACTION, kind === "RFQ" ? "RFQ" : "Quotation", entityId, {
    from,
    to,
    note: note ?? "",
  });
}

/** Record an approve/reject decision (approval history). */
export async function recordApproval(opts: {
  kind: WorkflowKind;
  entityId: string;
  decision: "APPROVED" | "REJECTED";
  actorId?: string | null;
  note?: string;
}): Promise<void> {
  const { kind, entityId, decision, actorId, note } = opts;
  await audit(actorId ?? null, APPROVAL_ACTION, kind === "RFQ" ? "RFQ" : "Quotation", entityId, {
    decision,
    note: note ?? "",
  });
}

/** Full chronological workflow + approval history for an entity. */
export async function workflowHistory(kind: WorkflowKind, entityId: string) {
  return prisma.auditLog.findMany({
    where: {
      entity: kind === "RFQ" ? "RFQ" : "Quotation",
      entityId,
      action: { in: [WORKFLOW_ACTION, APPROVAL_ACTION] },
    },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}
