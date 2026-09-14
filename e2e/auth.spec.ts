/**
 * E2E spec for authentication: landing page, login, and authenticated home.
 *
 * Run in the TESTING phase against live servers. Asserts on real content and
 * exercises the real HTTP boundary between frontend and backend.
 */
import { test, expect } from '@playwright/test';

test.describe('authentication', () => {
  test('landing page renders and routes to login', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /one calendar for every dock/i }),
    ).toBeVisible();
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: /sign in/i }),
    ).toBeVisible();
  });

  test('signs in with seeded credentials and reaches the app', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('booker@frostline.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole('heading', { name: /welcome/i }),
    ).toBeVisible();
  });

  test('rejects invalid credentials with an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('booker@frostline.example');
    await page.getByLabel(/password/i).fill('WrongPassword!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(
      page.getByText(/invalid email or password/i),
    ).toBeVisible();
  });
});
