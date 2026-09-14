import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Dockwise E2E tests.
 *
 * Starts the backend and frontend dev servers before the run and reuses them.
 * Specs live in the repo-root `e2e/` directory. The base URL points at the
 * frontend dev server, which proxies /api to the backend.
 */
export default defineConfig({
  testDir: '../e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'node node_modules/ts-node-dev/bin/ts-node-dev --files --respawn src/main.ts',
      cwd: '../backend',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
