import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against the real API (in-memory MongoDB, seeded) and the Next dev server.
 * Servers that are already running are reused, so `npm run e2e` works next to `npm run dev`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // one shared in-memory database
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      grepInvert: /@mobile/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } },
      grep: /@mobile/,
    },
  ],
  webServer: [
    {
      command: 'npm run dev:memory',
      cwd: '../server',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
