// Advanced RBAC — capability matrix.
//
// Role membership alone ("is this user staff?") is too coarse for the rules in
// the spec (e.g. a Procurement Manager may approve quotations but must NOT
// manage platform users). This module encodes a single source of truth mapping
// each role to the capabilities it holds, and a `can()` predicate used by API
// guards, services, and the UI. It is pure and fully unit-tested.

import { ROLES, type Role } from "./constants";

/** Every discrete action that RBAC gates. */
export const CAPABILITIES = {
  // Customer
  RFQ_UPLOAD: "RFQ_UPLOAD",
  PRODUCT_SEARCH: "PRODUCT_SEARCH",
  RFQ_BASKET_EDIT: "RFQ_BASKET_EDIT",
  QUOTATION_VIEW_PUBLISHED: "QUOTATION_VIEW_PUBLISHED",

  // Internal pricing visibility (cost / margin / vendor / internal notes)
  PRICING_INTERNAL_VIEW: "PRICING_INTERNAL_VIEW",

  // Quotation lifecycle
  QUOTATION_GENERATE_DRAFT: "QUOTATION_GENERATE_DRAFT",
  QUOTATION_REVIEW: "QUOTATION_REVIEW",
  QUOTATION_EDIT: "QUOTATION_EDIT",
  QUOTATION_SUBMIT_APPROVAL: "QUOTATION_SUBMIT_APPROVAL",
  QUOTATION_APPROVE: "QUOTATION_APPROVE",
  QUOTATION_PUBLISH: "QUOTATION_PUBLISH",

  // RFQ workflow review
  RFQ_REVIEW: "RFQ_REVIEW",

  // Vendor
  VENDOR_CATALOG_MANAGE: "VENDOR_CATALOG_MANAGE",
  VENDOR_COMPLIANCE_MANAGE: "VENDOR_COMPLIANCE_MANAGE",

  // Platform administration
  USER_MANAGE: "USER_MANAGE",
  ORG_MANAGE: "ORG_MANAGE",
  SYSTEM_ANALYTICS_VIEW: "SYSTEM_ANALYTICS_VIEW",
  PLATFORM_SETTINGS: "PLATFORM_SETTINGS",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

const C = CAPABILITIES;

// Capability sets, composed so higher roles inherit lower-role review powers
// where the spec allows it.
const CUSTOMER_CAPS: Capability[] = [
  C.RFQ_UPLOAD, C.PRODUCT_SEARCH, C.RFQ_BASKET_EDIT, C.QUOTATION_VIEW_PUBLISHED,
];

const VENDOR_CAPS: Capability[] = [
  C.PRODUCT_SEARCH, C.VENDOR_CATALOG_MANAGE, C.VENDOR_COMPLIANCE_MANAGE,
];

// Procurement Manager: review/approve/publish + internal pricing, but NO
// platform user/org administration (explicit spec constraint).
const PROCUREMENT_MANAGER_CAPS: Capability[] = [
  C.PRODUCT_SEARCH,
  C.PRICING_INTERNAL_VIEW,
  C.QUOTATION_GENERATE_DRAFT, C.QUOTATION_REVIEW, C.QUOTATION_EDIT,
  C.QUOTATION_SUBMIT_APPROVAL, C.QUOTATION_APPROVE, C.QUOTATION_PUBLISH,
  C.RFQ_REVIEW, C.SYSTEM_ANALYTICS_VIEW,
];

// Admin: everything a Procurement Manager can do + user/org management.
const ADMIN_CAPS: Capability[] = [
  ...PROCUREMENT_MANAGER_CAPS,
  C.USER_MANAGE, C.ORG_MANAGE,
];

// Super Admin: full platform control.
const SUPER_ADMIN_CAPS: Capability[] = [
  ...ADMIN_CAPS,
  C.PLATFORM_SETTINGS,
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  [ROLES.CUSTOMER]: CUSTOMER_CAPS,
  [ROLES.VENDOR]: VENDOR_CAPS,
  [ROLES.PROCUREMENT_MANAGER]: PROCUREMENT_MANAGER_CAPS,
  [ROLES.ADMIN]: ADMIN_CAPS,
  [ROLES.SUPER_ADMIN]: SUPER_ADMIN_CAPS,
};

/** True if `role` holds `capability`. Unknown roles hold nothing. */
export function can(role: string | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  const caps = ROLE_CAPABILITIES[role as Role];
  return !!caps && caps.includes(capability);
}

/** Throws a typed error when the role lacks the capability (for services). */
export class ForbiddenError extends Error {
  constructor(public capability: Capability, public role: string | null | undefined) {
    super(`Role "${role ?? "anonymous"}" lacks capability ${capability}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: string | null | undefined, capability: Capability): void {
  if (!can(role, capability)) throw new ForbiddenError(capability, role);
}

/** All capabilities a role holds (useful for UI gating / debugging). */
export function capabilitiesFor(role: string | null | undefined): Capability[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role as Role] ?? [];
}
