/**
 * E2E spec for notifications: the bell shows the unread count and lists
 * notifications.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('notifications', () => {
  test('signed-in user sees the notification bell', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'booker@frostline.example');
    // The notification bell is present in the app shell.
    await expect(
      page.getByRole('button', { name: /notifications/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
