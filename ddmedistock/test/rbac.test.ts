import { test } from "node:test";
import assert from "node:assert/strict";
import { can, assertCan, capabilitiesFor, ForbiddenError, CAPABILITIES as C } from "../src/lib/rbac";
import { ROLES } from "../src/lib/constants";

test("Customer can upload RFQs and view published quotations", () => {
  assert.ok(can(ROLES.CUSTOMER, C.RFQ_UPLOAD));
  assert.ok(can(ROLES.CUSTOMER, C.QUOTATION_VIEW_PUBLISHED));
  assert.ok(can(ROLES.CUSTOMER, C.PRODUCT_SEARCH));
});

test("Customer CANNOT generate/approve/publish or see internal pricing", () => {
  assert.equal(can(ROLES.CUSTOMER, C.QUOTATION_GENERATE_DRAFT), false);
  assert.equal(can(ROLES.CUSTOMER, C.QUOTATION_APPROVE), false);
  assert.equal(can(ROLES.CUSTOMER, C.QUOTATION_PUBLISH), false);
  assert.equal(can(ROLES.CUSTOMER, C.PRICING_INTERNAL_VIEW), false);
});

test("Procurement Manager CAN review, approve and publish quotations", () => {
  assert.ok(can(ROLES.PROCUREMENT_MANAGER, C.QUOTATION_REVIEW));
  assert.ok(can(ROLES.PROCUREMENT_MANAGER, C.QUOTATION_APPROVE));
  assert.ok(can(ROLES.PROCUREMENT_MANAGER, C.QUOTATION_PUBLISH));
  assert.ok(can(ROLES.PROCUREMENT_MANAGER, C.RFQ_REVIEW));
});

test("Procurement Manager CANNOT manage platform users or orgs", () => {
  assert.equal(can(ROLES.PROCUREMENT_MANAGER, C.USER_MANAGE), false);
  assert.equal(can(ROLES.PROCUREMENT_MANAGER, C.ORG_MANAGE), false);
  assert.equal(can(ROLES.PROCUREMENT_MANAGER, C.PLATFORM_SETTINGS), false);
});

test("Admin can manage users/orgs and everything a PM can", () => {
  assert.ok(can(ROLES.ADMIN, C.USER_MANAGE));
  assert.ok(can(ROLES.ADMIN, C.ORG_MANAGE));
  assert.ok(can(ROLES.ADMIN, C.QUOTATION_APPROVE));
  assert.equal(can(ROLES.ADMIN, C.PLATFORM_SETTINGS), false); // super-admin only
});

test("Super Admin holds platform settings (and inherits all admin caps)", () => {
  assert.ok(can(ROLES.SUPER_ADMIN, C.PLATFORM_SETTINGS));
  assert.ok(can(ROLES.SUPER_ADMIN, C.USER_MANAGE));
  assert.ok(can(ROLES.SUPER_ADMIN, C.QUOTATION_PUBLISH));
});

test("Vendor can manage own catalog/compliance but not quotations", () => {
  assert.ok(can(ROLES.VENDOR, C.VENDOR_CATALOG_MANAGE));
  assert.ok(can(ROLES.VENDOR, C.VENDOR_COMPLIANCE_MANAGE));
  assert.equal(can(ROLES.VENDOR, C.QUOTATION_APPROVE), false);
  assert.equal(can(ROLES.VENDOR, C.RFQ_UPLOAD), false);
});

test("unknown / null role holds nothing", () => {
  assert.equal(can(null, C.PRODUCT_SEARCH), false);
  assert.equal(can("WIZARD", C.PRODUCT_SEARCH), false);
  assert.deepEqual(capabilitiesFor(undefined), []);
});

test("assertCan throws ForbiddenError when lacking capability", () => {
  assert.throws(() => assertCan(ROLES.CUSTOMER, C.QUOTATION_PUBLISH), ForbiddenError);
  assert.doesNotThrow(() => assertCan(ROLES.ADMIN, C.QUOTATION_PUBLISH));
});

test("No role except staff can approve — AI/customers/vendors excluded", () => {
  const approvers = Object.values(ROLES).filter((r) => can(r, C.QUOTATION_APPROVE));
  assert.deepEqual(
    approvers.sort(),
    [ROLES.ADMIN, ROLES.PROCUREMENT_MANAGER, ROLES.SUPER_ADMIN].sort(),
  );
});
