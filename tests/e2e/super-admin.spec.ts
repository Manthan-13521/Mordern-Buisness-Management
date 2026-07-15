import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Super Admin Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should load superadmin dashboard', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/superadmin/);
  });

  test('should list all pools', async ({ page }) => {
    await page.goto('/superadmin/pools');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/pools/);
  });

  test('should list all hostels', async ({ page }) => {
    await page.goto('/superadmin/hostels');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/hostels/);
  });

  test('should list all businesses', async ({ page }) => {
    await page.goto('/superadmin/businesses');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/businesses/);
  });

  test('should show feedback', async ({ page }) => {
    await page.goto('/superadmin/feedback');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/feedback/);
  });

  test('should show referrals', async ({ page }) => {
    await page.goto('/superadmin/referrals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/referrals/);
  });

  test('should navigate to ads', async ({ page }) => {
    await page.goto('/superadmin/ads');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/ads/);
  });
});
