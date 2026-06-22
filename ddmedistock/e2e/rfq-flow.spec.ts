import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Customer can create an RFQ from pasted text; CSRF blocks cross-site POSTs.
test.describe("RFQ creation", () => {
  test("customer creates an RFQ via the API and it is processed", async ({ page, baseURL }) => {
    await login(page, "customer");
    // page.request shares the browser context's cookie jar (session cookie).
    // A real browser fetch sends an Origin header; supply it so the same-origin
    // CSRF check passes.
    const res = await page.request.post("/api/rfqs", {
      headers: { origin: baseURL! },
      data: {
        title: "E2E paste RFQ",
        rawText: "Disposable Syringe 5ml - 250 nos\nSurgical Gloves Medium - 100 pairs",
        sourceType: "TEXT",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBeTruthy();
    expect(body.id).toBeTruthy();
  });

  test("cross-site POST to create an RFQ is blocked (CSRF)", async ({ request }) => {
    const res = await request.post("/api/rfqs", {
      headers: { origin: "https://evil.example" },
      data: { title: "x", rawText: "y" },
    });
    expect(res.status()).toBe(403);
  });
});
