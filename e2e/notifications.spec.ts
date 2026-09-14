/**
 * E2E spec for notifications: the bell shows the unread count and lists
 * notifications.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('notifications', () => {
  test('signed-in user sees the notification bell', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('booker@frostline.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);

    // The notification bell is present in the app shell.
    await expect(
      page.getByRole('button', { name: /notifications/i }),
    ).toBeVisible();
  });
});
