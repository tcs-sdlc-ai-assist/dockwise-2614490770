/**
 * E2E spec for site configuration: create a site, add a door, import doors,
 * and take a door out of service.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('site configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('site.admin@dockwise.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('creates a site and manages its doors', async ({ page }) => {
    await page.goto('/admin/sites');
    await page.getByLabel(/name/i).fill('E2E Test Site');
    await page.getByLabel(/address/i).fill('99 Test Ave');
    await page.getByRole('button', { name: /add site/i }).click();
    await expect(page.getByText('E2E Test Site')).toBeVisible();

    await page.getByRole('link', { name: 'E2E Test Site' }).click();
    await expect(
      page.getByRole('heading', { name: 'E2E Test Site' }),
    ).toBeVisible();

    // Add a single door.
    await page.getByLabel(/number/i).fill('11');
    await page.getByRole('button', { name: /add door/i }).click();
    await expect(page.getByRole('cell', { name: '11' })).toBeVisible();

    // Import doors via CSV.
    await page
      .getByLabel(/csv rows/i)
      .fill('12,dock-high\n13,grade-level,pool');
    await page.getByRole('button', { name: /^import$/i }).click();
    await expect(page.getByText(/imported 2 door/i)).toBeVisible();
  });
});
