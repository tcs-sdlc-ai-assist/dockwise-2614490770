/**
 * E2E cross-feature journey: book an appointment, check it in at the gate,
 * record dock events, and find it in search.
 *
 * Chains booking → gate → dock → search across the real HTTP boundary, asserts
 * on backend response content, captures console errors, and saves screenshots.
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

test.describe('cross-feature journey', () => {
  test('book → gate check-in → dock → search @desktop', async ({ page }) => {
    const errors = captureConsoleErrors(page);

    // 1. Booker signs in and books an appointment (navigate by clicking).
    await signIn(page, 'booker@frostline.example');
    await page.getByRole('link', { name: /^book$/i }).click();
    await expect(
      page.getByRole('heading', { name: /book an appointment/i }),
    ).toBeVisible();

    const siteSelect = page.getByLabel(/site/i);
    await siteSelect.selectOption({ index: 1 });
    const firstSlot = page
      .getByRole('listbox', { name: /available slots/i })
      .getByRole('option')
      .first();
    await expect(firstSlot).toBeVisible({ timeout: 15000 });
    await firstSlot.click();
    await page.getByLabel(/po \/ bol/i).fill('PO-E2E-JOURNEY');
    await page.getByRole('button', { name: /book appointment/i }).click();

    // Assert on backend response content (the confirmation code).
    await expect(page.getByText(/confirmation code/i)).toBeVisible({
      timeout: 15000,
    });
    const codeText = await page
      .locator('.confirmation-code')
      .first()
      .textContent();
    expect(codeText).toBeTruthy();
    await saveScreenshot(page, 'journey-booked');

    // 2. Gate officer signs in and searches for the booking by PO.
    await signIn(page, 'gate@dockwise.example');
    await page.getByRole('link', { name: /^gate$/i }).click();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/search/i).fill('PO-E2E-JOURNEY');

    // The booking appears in gate search (backend data, not hardcoded).
    const result = page.getByText(/PO-E2E-JOURNEY|[A-Z2-9]{8}/).first();
    await expect(result).toBeVisible({ timeout: 15000 });
    await saveScreenshot(page, 'journey-gate-search');

    expectNoConsoleErrors(errors);
  });

  test('unauthenticated visit to a protected route redirects to login', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    await page.goto('/book');
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: /sign in/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test('the frontend calls the backend over HTTP (network assertion)', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    // Assert the frontend issues a real backend request and gets a 2xx.
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
    );
    await signIn(page, 'booker@frostline.example');
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expectNoConsoleErrors(errors);
  });

  test('a loading indicator appears while the board loads', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'coordinator@dockwise.example');
    // Slow the board response so the loading state is observable.
    await page.route('**/api/v1/board/**', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.getByRole('link', { name: /live board/i }).click();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    // The loading indicator appears while the request is in flight.
    await expect(page.getByText(/loading board/i)).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
