# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/responsive.spec.ts >> Responsive Layout >> should render /business/test-biz/admin/analytics at desktop (1440x900)
- Location: tests/e2e/responsive.spec.ts:33:11

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | export async function loginAsAdmin(page: Page): Promise<void> {
  4  |   const email = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
  5  |   const password = process.env.E2E_ADMIN_PASSWORD || 'testpassword123';
  6  | 
> 7  |   await page.goto('/login');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8  |   await page.waitForLoadState('networkidle');
  9  | 
  10 |   const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
  11 |   const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
  12 |   const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  13 | 
  14 |   if (await emailInput.isVisible()) {
  15 |     await emailInput.fill(email);
  16 |     await passwordInput.fill(password);
  17 |     await submitBtn.click();
  18 |     await page.waitForLoadState('networkidle');
  19 |     // Wait for redirect away from /login
  20 |     await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
  21 |   }
  22 | }
  23 | 
  24 | export async function logout(page: Page): Promise<void> {
  25 |   const logoutBtn = page.locator(
  26 |     'button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")'
  27 |   );
  28 |   if (await logoutBtn.isVisible()) {
  29 |     await logoutBtn.click();
  30 |     await page.waitForLoadState('networkidle');
  31 |   }
  32 | }
  33 | 
```