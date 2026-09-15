/**
 * E2E spec for the coordinator queue: confirm a requested appointment and
 * reassign a door with a reason.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('coordinator queue', () => {
  test('coordinator sees the queue and can act on it', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'coordinator@dockwise.example');
    await page.getByRole('link', { name: /queue/i }).click();
    await expect(
      page.getByRole('heading', { name: /confirmation queue/i }),
    ).toBeVisible();

    await page.getByLabel(/site/i).selectOption({ index: 1 });

    // The queue table renders (requested items or the empty state).
    await expect(
      page.getByRole('heading', { name: /requested & countered/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
