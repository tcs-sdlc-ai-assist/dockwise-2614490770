import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Dockwise E2E tests.
 *
 * Starts the backend and frontend dev servers before the run and reuses them.
 * Specs live in the repo-root `e2e/` directory. The base URL points at the
 * frontend dev server, which proxies /api to the backend.
 */
export default defineConfig({
  testDir: './e2e',
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
      // Stateful journeys tagged @desktop mutate shared backend state and run
      // once on the desktop project; the mobile project covers the lighter
      // read-only specs.
      grepInvert: /@desktop/,
    },
  ],
  // Playwright starts and manages both servers for the duration of the run.
  // The backend runs the compiled output with a /tmp SQLite database (the
  // workspace mount is NTFS and breaks SQLite locking). The frontend dev server
  // proxies /api to the backend.
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../backend',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DB_PATH: '/tmp/dockwise-e2e.db',
        SEED_ON_STARTUP: 'true',
        PORT: '3001',
        NODE_ENV: 'production',
      },
    },
    {
      command: 'node node_modules/vite/bin/vite.js dev --port 5173 --strictPort',
      cwd: '.',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
