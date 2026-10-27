import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'work/e2e-results.json' }]],
  use: { baseURL: process.env.LATCH_TEST_URL || 'http://127.0.0.1:4317', headless: true, trace: 'retain-on-failure' },
  webServer: process.env.LATCH_TEST_URL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:4317', reuseExistingServer: true, timeout: 30_000 },
});
