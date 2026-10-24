import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: 'list',
  outputDir: 'node_modules/.cache/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:5181',
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    viewport: { width: 360, height: 800 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: !process.env.CI,
  },
})