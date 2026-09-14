/**
 * E2E spec for the live board: select a site and see the four columns.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('live board', () => {
  test('coordinator sees the four board columns', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('coordinator@dockwise.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto('/board');
    await expect(
      page.getByRole('heading', { name: /live board/i }),
    ).toBeVisible();

    await page.getByLabel(/site/i).selectOption({ index: 1 });

    await expect(
      page.getByRole('heading', { name: /upcoming \(2h\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /in yard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /at door/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /exceptions/i }),
    ).toBeVisible();
  });
});
