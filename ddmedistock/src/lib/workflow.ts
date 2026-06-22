// Workflow engine — RFQ and Quotation state machines.
//
// Encodes the legal state transitions from the spec so status changes are
// validated centrally instead of being set ad-hoc across routes. Pure and
// fully unit-tested; services call `assertTransition` before persisting and
// record the move via the workflow log (see services/workflow-log.ts).

import { RFQ_STATUS, QUOTATION_STATUS } from "./constants";

// ── RFQ workflow ────────────────────────────────────────────────────────────
// Spec states map onto the existing String column. DRAFT/SUBMITTED/PROCESSING
// front-load the customer→system handoff; the rest already existed.
export const RFQ_STATES = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PROCESSING: "PROCESSING",
  MATCHING_COMPLETED: RFQ_STATUS.MATCHING_COMPLETED,
  QUOTATION_IN_PROGRESS: RFQ_STATUS.QUOTATION_IN_PROGRESS,
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  PUBLISHED: "PUBLISHED",
  REJECTED: RFQ_STATUS.REJECTED,
  // Legacy/among existing data:
  UNDER_REVIEW: RFQ_STATUS.UNDER_REVIEW,
  QUOTATION_UPLOADED: RFQ_STATUS.QUOTATION_UPLOADED,
  APPROVED: RFQ_STATUS.APPROVED,
} as const;

export type RfqState = (typeof RFQ_STATES)[keyof typeof RFQ_STATES];

const RFQ_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["PROCESSING", "REJECTED"],
  UNDER_REVIEW: ["PROCESSING", "MATCHING_COMPLETED", "REJECTED"],
  PROCESSING: ["MATCHING_COMPLETED", "REJECTED"],
  MATCHING_COMPLETED: ["QUOTATION_IN_PROGRESS", "REJECTED"],
  QUOTATION_IN_PROGRESS: ["AWAITING_APPROVAL", "QUOTATION_UPLOADED", "REJECTED"],
  AWAITING_APPROVAL: ["PUBLISHED", "QUOTATION_IN_PROGRESS", "REJECTED"],
  QUOTATION_UPLOADED: ["PUBLISHED", "APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: [],
  REJECTED: [],
};

// ── Quotation workflow ───────────────────────────────────────────────────────
// AI_GENERATED is the entry state (the AI may draft but never approve/publish).
export const QUOTATION_STATES = {
  DRAFT: QUOTATION_STATUS.DRAFT,
  AI_GENERATED: "AI_GENERATED",
  UNDER_REVIEW: "UNDER_REVIEW",
  PENDING_APPROVAL: QUOTATION_STATUS.PENDING_APPROVAL,
  APPROVED: "APPROVED",
  PUBLISHED: QUOTATION_STATUS.PUBLISHED,
  ARCHIVED: "ARCHIVED",
} as const;

export type QuotationState = (typeof QUOTATION_STATES)[keyof typeof QUOTATION_STATES];

const QUOTATION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["AI_GENERATED", "UNDER_REVIEW", "PENDING_APPROVAL"],
  AI_GENERATED: ["UNDER_REVIEW", "DRAFT"],
  UNDER_REVIEW: ["PENDING_APPROVAL", "DRAFT"],
  PENDING_APPROVAL: ["APPROVED", "UNDER_REVIEW", "DRAFT"],
  APPROVED: ["PUBLISHED", "UNDER_REVIEW"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export type WorkflowKind = "RFQ" | "QUOTATION";

function table(kind: WorkflowKind): Record<string, string[]> {
  return kind === "RFQ" ? RFQ_TRANSITIONS : QUOTATION_TRANSITIONS;
}

/** True if `from → to` is a legal transition for the given workflow. */
export function canTransition(kind: WorkflowKind, from: string, to: string): boolean {
  if (from === to) return true; // idempotent no-op
  const allowed = table(kind)[from];
  return !!allowed && allowed.includes(to);
}

/** Legal next states from `from`. */
export function nextStates(kind: WorkflowKind, from: string): string[] {
  return table(kind)[from] ?? [];
}

export class InvalidTransitionError extends Error {
  constructor(public kind: WorkflowKind, public from: string, public to: string) {
    super(`Illegal ${kind} transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/** Throws unless `from → to` is legal. */
export function assertTransition(kind: WorkflowKind, from: string, to: string): void {
  if (!canTransition(kind, from, to)) throw new InvalidTransitionError(kind, from, to);
}
