import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Hostel Dashboard Module', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should load hostel dashboard', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should navigate to hostel members', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/members');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/members/);
  });

  test('should navigate to hostel plans', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/plans');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/plans/);
  });

  test('should navigate to hostel payments', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/payments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/payments/);
  });

  test('should navigate to hostel staff', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/staff');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/staff/);
  });

  test('should navigate to hostel settings', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/settings/);
  });

  test('should navigate to hostel analytics', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/analytics/);
  });

  test('should show hostel overview', async ({ page }) => {
    await page.goto('/hostel/test-hostel/admin/overview');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/overview/);
  });
});
