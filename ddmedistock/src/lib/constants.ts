// Shared enum-like constants (stored as String columns for portability).

export const ROLES = {
  CUSTOMER: "CUSTOMER",
  VENDOR: "VENDOR",
  ADMIN: "ADMIN",
  PROCUREMENT_MANAGER: "PROCUREMENT_MANAGER",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  ADMIN: "Admin",
  PROCUREMENT_MANAGER: "Procurement Manager",
  SUPER_ADMIN: "Super Admin",
};

// Staff roles share the Admin portal. SUPER_ADMIN additionally manages users.
export const STAFF_ROLES: string[] = [ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.SUPER_ADMIN];

// Where each role lands after login.
export const HOME_BY_ROLE: Record<string, string> = {
  CUSTOMER: "/customer",
  VENDOR: "/vendor",
  ADMIN: "/admin",
  PROCUREMENT_MANAGER: "/admin",
  SUPER_ADMIN: "/admin",
};

export const RFQ_STATUS = {
  UNDER_REVIEW: "UNDER_REVIEW",
  MATCHING_COMPLETED: "MATCHING_COMPLETED",
  QUOTATION_IN_PROGRESS: "QUOTATION_IN_PROGRESS",
  QUOTATION_UPLOADED: "QUOTATION_UPLOADED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type RfqStatus = (typeof RFQ_STATUS)[keyof typeof RFQ_STATUS];

export const RFQ_STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Under Review",
  MATCHING_COMPLETED: "Matching Completed",
  QUOTATION_IN_PROGRESS: "Quotation In Progress",
  QUOTATION_UPLOADED: "Quotation Uploaded",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const QUOTATION_STATUS = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  PUBLISHED: "PUBLISHED",
} as const;

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "AI Draft",
  PENDING_APPROVAL: "Pending Approval",
  PUBLISHED: "Published",
};

export const ORIGIN = {
  DOMESTIC: "DOMESTIC",
  IMPORTED: "IMPORTED",
} as const;

export const VENDOR_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  SUSPENDED: "SUSPENDED",
} as const;

export const ORG_TYPES = ["HOSPITAL", "CLINIC", "LAB", "OTHER"] as const;
