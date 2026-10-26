import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  projects: [
    { name: 'chromium-utc', use: { browserName: 'chromium', timezoneId: 'UTC' } },
    { name: 'chromium-los-angeles', use: { browserName: 'chromium', timezoneId: 'America/Los_Angeles' } },
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    trace: 'retain-on-failure',
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
