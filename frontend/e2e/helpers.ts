/**
 * Shared E2E helpers: console-error capture and screenshot evidence.
 *
 * Every spec captures browser console errors and page errors before
 * navigation and fails on them, and saves a screenshot for the human reviewer.
 */
import { test, expect, type Page } from '@playwright/test';

/**
 * Capture browser console errors and page errors for a test.
 *
 * Args:
 *   page: The Playwright page.
 *
 * Returns:
 *   An array that accumulates error strings; assert it is empty at the end.
 */
export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return;
    }
    const text = msg.text();
    // Ignore expected resource-load failures that are part of the journey
    // under test (e.g. a 401 from a failed login, or a 409 conflict).
    if (
      /Failed to load resource: the server responded with a status of (401|403|404|409)/.test(
        text,
      )
    ) {
      return;
    }
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

/**
 * Assert no console/page errors were captured.
 *
 * Args:
 *   errors: The accumulated error strings.
 */
export function expectNoConsoleErrors(errors: string[]): void {
  expect(errors).toEqual([]);
}

/**
 * Save a screenshot for the human reviewer.
 *
 * Args:
 *   page: The Playwright page.
 *   name: The screenshot file name.
 */
export async function saveScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

/**
 * Sign in with the given seeded credentials.
 *
 * Args:
 *   page: The Playwright page.
 *   email: The account email.
 *   password: The account password.
 */
export async function signIn(
  page: Page,
  email: string,
  password = 'DockwiseDemo!1',
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/app/);
}
