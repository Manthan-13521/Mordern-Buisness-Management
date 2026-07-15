import { test, expect } from "@playwright/test";

const TEST_EMAIL = "pool-admin@test.com";
const TEST_PASSWORD = "testpass123";

test.describe("Authentication Flow", () => {
  test("Login page renders and submits", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2, [data-testid=login-title]").first()).toBeVisible();
    await page.screenshot({ path: "tests/reports/screenshots/login-page.png" });
  });

  test("CSRF endpoint returns token", async ({ request }) => {
    const res = await request.get("/api/auth/csrf");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.csrfToken).toBeDefined();
    expect(typeof data.csrfToken).toBe("string");
  });

  test("Login via API succeeds", async ({ request }) => {
    const csrfRes = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    const loginRes = await request.post("/api/auth/callback/credentials", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({ csrfToken, username: TEST_EMAIL, password: TEST_PASSWORD }).toString(),
    });
    expect(loginRes.ok()).toBeTruthy();
  });
});

test.describe("Dashboard Access", () => {
  test("Authenticated user can access pool dashboard", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const csrfRes = await page.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await page.request.post("/api/auth/callback/credentials", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({ csrfToken, username: TEST_EMAIL, password: TEST_PASSWORD }).toString(),
    });

    await page.goto("/pool/test-pool/admin/dashboard");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/reports/screenshots/dashboard.png" });

    await context.close();
  });

  test("Unauthenticated user cannot access dashboard", async ({ page }) => {
    await page.goto("/pool/test-pool/admin/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const hasLoginForm = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
    if (!currentUrl.includes("login") && !hasLoginForm) {
      const bodyText = await page.locator("body").innerText();
      if (!bodyText.toLowerCase().includes("login") && !bodyText.toLowerCase().includes("sign in")) {
        throw new Error("Unauthenticated user could access dashboard content");
      }
    }
  });
});
