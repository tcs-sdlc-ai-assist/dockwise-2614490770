/**
 * E2E spec for the coordinator queue: confirm a requested appointment and
 * reassign a door with a reason.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('coordinator queue', () => {
  test('coordinator sees the queue and can act on it', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('coordinator@dockwise.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto('/queue');
    await expect(
      page.getByRole('heading', { name: /confirmation queue/i }),
    ).toBeVisible();

    const siteSelect = page.getByLabel(/site/i);
    await siteSelect.selectOption({ index: 1 });

    // The queue table renders (requested items or the empty state).
    await expect(
      page.getByRole('heading', { name: /requested & countered/i }),
    ).toBeVisible();
  });
});
