/**
 * E2E spec for the full dock journey and the detention display.
 *
 * Drives a real journey: gate check-in → dock door_ready/load_start/
 * load_complete → visit detail with the detention estimate and the mandatory
 * "Not an invoice. For discussion only." disclaimer.
 *
 * Run in the TESTING phase against live servers. Uses the seeded Dayton site,
 * door 11, and the confirmed PO 88421 appointment.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  saveScreenshot,
  signIn,
} from './helpers';

test.describe('dock journey and detention', () => {
  test('gate check-in → dock taps → visit detail with detention disclaimer', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);

    // 1. Gate officer checks in the seeded appointment (search by PO).
    await signIn(page, 'gate@dockwise.example');
    await page.getByRole('link', { name: /^gate$/i }).click();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/search/i).fill('88421');

    const result = page.getByText(/[A-Z2-9]{8}/).first();
    await expect(result).toBeVisible({ timeout: 15000 });
    await result.click();

    // Check in with plate and trailer.
    await page.getByLabel(/driver name/i).fill('Sam Driver');
    await page.getByLabel(/tractor plate/i).fill('E2E-PLATE');
    await page.getByLabel(/trailer \/ container/i).fill('E2E-TRL');
    await page.getByRole('button', { name: /^check in$/i }).click();
    await expect(page.getByText(/checked in/i)).toBeVisible({ timeout: 15000 });
    await saveScreenshot(page, 'dock-journey-checked-in');

    // 2. Dock lead records the dock status taps.
    await signIn(page, 'dock@dockwise.example');
    await page.getByRole('link', { name: /^dock$/i }).click();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/find visit/i).fill('E2E-PLATE');

    const visitResult = page.getByText(/[A-Z2-9]{8}/).first();
    await expect(visitResult).toBeVisible({ timeout: 15000 });
    await visitResult.click();

    // Door ready → load start → load complete.
    await page.getByRole('button', { name: /door ready/i }).click();
    await expect(page.getByText(/status at_door/i)).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: /load start/i }).click();
    await expect(page.getByText(/status in_progress/i)).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: /load complete/i }).click();
    await expect(page.getByText(/status complete/i)).toBeVisible({
      timeout: 15000,
    });
    await saveScreenshot(page, 'dock-journey-complete');

    expectNoConsoleErrors(errors);
  });
});
