import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const PAGES = [
  '/pool/test-pool/admin/dashboard',
  '/pool/test-pool/admin/members',
  '/pool/test-pool/admin/payments',
  '/pool/test-pool/admin/plans',
  '/pool/test-pool/admin/staff',
  '/pool/test-pool/admin/settings',
  '/hostel/test-hostel/admin/dashboard',
  '/hostel/test-hostel/admin/members',
  '/hostel/test-hostel/admin/plans',
  '/business/test-biz/admin/dashboard',
  '/business/test-biz/admin/analytics',
  '/business/test-biz/admin/customers',
];

const VIEWPORTS = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'desktop' },
];

test.describe('Responsive Layout', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const pageUrl of PAGES) {
    for (const vp of VIEWPORTS) {
      test(`should render ${pageUrl} at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageUrl);
        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        await expect(body).toBeVisible();
      });
    }
  }
});
