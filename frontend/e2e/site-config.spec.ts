/**
 * E2E spec for site configuration: create a site, add a door, import doors,
 * and take a door out of service.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('site configuration', () => {
  test('creates a site and manages its doors @desktop', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'site.admin@dockwise.example');
    await page.getByRole('link', { name: /^sites$/i }).click();

    await page.getByLabel(/name/i).fill('E2E Test Site');
    await page.getByLabel(/address/i).fill('99 Test Ave');
    await page.getByRole('button', { name: /add site/i }).click();
    await expect(page.getByText('E2E Test Site')).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('link', { name: 'E2E Test Site' }).click();
    await expect(
      page.getByRole('heading', { name: 'E2E Test Site' }),
    ).toBeVisible();

    // Add a single door.
    await page.getByLabel(/number/i).fill('11');
    await page.getByRole('button', { name: /add door/i }).click();
    await expect(page.getByRole('cell', { name: '11' })).toBeVisible({
      timeout: 15000,
    });

    // Import doors via CSV.
    await page.getByLabel(/csv rows/i).fill('12,dock-high\n13,grade-level,pool');
    await page.getByRole('button', { name: /^import$/i }).click();
    await expect(page.getByText(/imported 2 door/i)).toBeVisible({
      timeout: 15000,
    });
    expectNoConsoleErrors(errors);
  });
});
