import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Pool Dashboard Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should load pool dashboard overview', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should navigate to pool members', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/members');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/members/);
  });

  test('should navigate to pool plans', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/plans');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/plans/);
  });

  test('should navigate to pool payments', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/payments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/payments/);
  });

  test('should navigate to pool staff', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/staff');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/staff/);
  });

  test('should navigate to pool entry', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/entry');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/entry/);
  });

  test('should navigate to pool settings', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/settings/);
  });

  test('should show member detail page', async ({ page }) => {
    await page.goto('/pool/test-pool/admin/expired-members');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/expired/);
  });
});
