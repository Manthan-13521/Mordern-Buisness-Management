import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
  const password = process.env.E2E_ADMIN_PASSWORD || 'testpassword123';

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
  const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitBtn.click();
    await page.waitForLoadState('networkidle');
    // Wait for redirect away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
  }
}

export async function logout(page: Page): Promise<void> {
  const logoutBtn = page.locator(
    'button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")'
  );
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForLoadState('networkidle');
  }
}
