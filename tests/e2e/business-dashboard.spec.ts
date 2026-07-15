import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Business Dashboard Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should load business dashboard', async ({ page }) => {
    await page.goto('/business/test-biz/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should load analytics page', async ({ page }) => {
    await page.goto('/business/test-biz/admin/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/analytics/);
  });

  test('should navigate to customers', async ({ page }) => {
    await page.goto('/business/test-biz/admin/customers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/customers/);
  });

  test('should navigate to sales', async ({ page }) => {
    await page.goto('/business/test-biz/admin/sales');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/sales/);
  });

  test('should navigate to business payments', async ({ page }) => {
    await page.goto('/business/test-biz/admin/payments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/payments/);
  });

  test('should navigate to stock management', async ({ page }) => {
    await page.goto('/business/test-biz/admin/stock');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/stock/);
  });

  test('should navigate to labour management', async ({ page }) => {
    await page.goto('/business/test-biz/admin/labour');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/labour/);
  });

  test('should load business settings', async ({ page }) => {
    await page.goto('/business/test-biz/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/settings/);
  });
});
