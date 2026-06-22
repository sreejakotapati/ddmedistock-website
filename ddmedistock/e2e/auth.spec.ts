import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test("login page renders the form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("invalid credentials are rejected", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("nobody@example.com");
    await page.locator('input[type="password"]').fill("wrongpass");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test("customer logs in and lands on the customer portal", async ({ page }) => {
    await login(page, "customer");
    await expect(page).toHaveURL(/\/customer/);
  });

  test("admin logs in and lands on the admin portal", async ({ page }) => {
    await login(page, "admin");
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe("Security headers", () => {
  test("responses carry the strict security headers", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
  });
});
