import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Phase-12 access rules, enforced by middleware, verified end-to-end.
test.describe("RBAC route protection", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("customer cannot reach the admin portal", async ({ page }) => {
    await login(page, "customer");
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin(\/|$)/);
    await expect(page).toHaveURL(/\/customer/);
  });

  test("customer cannot reach the vendor portal", async ({ page }) => {
    await login(page, "customer");
    await page.goto("/vendor");
    await expect(page).not.toHaveURL(/\/vendor(\/|$)/);
  });

  test("staff can reach the admin portal", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe("API authorization", () => {
  test("queue dashboard endpoint rejects anonymous access", async ({ request }) => {
    const res = await request.get("/api/admin/queues");
    expect(res.status()).toBe(401);
  });

  test("OpenAPI spec is publicly served", async ({ request }) => {
    const res = await request.get("/api/openapi");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.openapi).toBe("3.1.0");
  });
});
