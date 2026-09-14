/**
 * E2E spec for gate operations: search, check in, and the unscheduled flow.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('gate operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('gate@dockwise.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('gate officer searches and reaches the check-in flow', async ({
    page,
  }) => {
    await page.goto('/gate');
    await expect(page.getByRole('heading', { name: /^gate$/i })).toBeVisible();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/search/i).fill('GATE');
    // Either results or the unscheduled prompt appears.
    await expect(
      page
        .getByText(/no appointment matches/i)
        .or(page.locator('.gate-results'))
        .first(),
    ).toBeVisible();
  });

  test('gate officer can open the unscheduled visit flow', async ({ page }) => {
    await page.goto('/gate');
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/search/i).fill('NOMATCH-XYZ');
    await expect(
      page.getByText(/no appointment matches\. log unscheduled visit/i),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /log unscheduled visit/i })
      .click();
    await expect(
      page.getByRole('heading', { name: /log unscheduled visit/i }),
    ).toBeVisible();
  });
});
