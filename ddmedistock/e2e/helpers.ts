import { type Page } from "@playwright/test";

// Demo credentials seeded by prisma/seed.ts (all password: password123).
export const USERS = {
  customer: { email: "procurement@cityhospital.in", home: "/customer" },
  admin: { email: "admin@ddmedistock.com", home: "/admin" },
  manager: { email: "manager@ddmedistock.com", home: "/admin" },
  vendor: { email: "sales@medsupply.in", home: "/vendor" },
} as const;

export const PASSWORD = "password123";

/** Log in through the real login form and wait for the role landing page. */
export async function login(page: Page, user: keyof typeof USERS): Promise<void> {
  const u = USERS[user];
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(u.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for the role landing page. If login is rejected (e.g. an inline error
  // appears) fail fast with a clear message instead of a silent nav timeout.
  await Promise.race([
    page.waitForURL(new RegExp(`${u.home}(/|$)`), { timeout: 15_000 }),
    page
      .locator("text=/login failed|invalid|too many/i")
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => {
        throw new Error(`login(${user}) rejected: an error message was shown instead of redirecting`);
      }),
  ]);
}
