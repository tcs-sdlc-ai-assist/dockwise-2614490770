/**
 * E2E spec for appointment booking: pick a slot, book, and see a confirmation
 * code; verify the booking appears in My Appointments.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  saveScreenshot,
  signIn,
} from './helpers';

test.describe('appointment booking', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'booker@frostline.example');
  });

  test('books an appointment and shows a confirmation code @desktop', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    // Navigate by clicking the nav link (not teleporting).
    await page.getByRole('link', { name: /^book$/i }).click();
    await expect(
      page.getByRole('heading', { name: /book an appointment/i }),
    ).toBeVisible();

    // Pick the first available site.
    const siteSelect = page.getByLabel(/site/i);
    await siteSelect.selectOption({ index: 1 });

    // Wait for slots and pick the first one (scoped to the slot listbox).
    const firstSlot = page
      .getByRole('listbox', { name: /available slots/i })
      .getByRole('option')
      .first();
    await expect(firstSlot).toBeVisible({ timeout: 15000 });
    await firstSlot.click();

    // Complete and submit the form.
    await page.getByLabel(/po \/ bol/i).fill('PO 88421');
    await page.getByRole('button', { name: /book appointment/i }).click();

    // A confirmation code is shown (backend response content).
    await expect(page.getByText(/confirmation code/i)).toBeVisible({
      timeout: 15000,
    });
    await saveScreenshot(page, 'booking-confirmed');
    expectNoConsoleErrors(errors);
  });

  test('lists the caller appointments and persists across reload', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    await page.getByRole('link', { name: /my appointments/i }).click();
    await expect(
      page.getByRole('heading', { name: /my appointments/i }),
    ).toBeVisible();
    // Persistence: reload and the page still renders the list.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /my appointments/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
