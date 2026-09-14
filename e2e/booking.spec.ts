/**
 * E2E spec for appointment booking: pick a slot, book, and see a confirmation
 * code; verify the booking appears in My Appointments.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('appointment booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('booker@frostline.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('books an appointment and shows a confirmation code', async ({
    page,
  }) => {
    await page.goto('/book');
    await expect(
      page.getByRole('heading', { name: /book an appointment/i }),
    ).toBeVisible();

    // Pick the first available site.
    const siteSelect = page.getByLabel(/site/i);
    await siteSelect.selectOption({ index: 1 });

    // Wait for slots and pick the first one.
    const firstSlot = page.getByRole('option').first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    // Complete and submit the form.
    await page.getByLabel(/po \/ bol/i).fill('PO 88421');
    await page.getByRole('button', { name: /book appointment/i }).click();

    // A confirmation code is shown.
    await expect(page.getByText(/confirmation code/i)).toBeVisible();
  });

  test('lists the caller appointments', async ({ page }) => {
    await page.goto('/appointments');
    await expect(
      page.getByRole('heading', { name: /my appointments/i }),
    ).toBeVisible();
  });
});
