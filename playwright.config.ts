import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

/**
 * E2E（§14-M1「Playwright 提前搭建」）：只跑浏览器模式（`pnpm dev`，内存持久层）。
 * Tauri 专有面（SQLite/窗口/PDF/圆角）不在 E2E 范围，仍走 `docs/dev/acceptance/M1.md` 人工验收。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:1420',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @fairlens/desktop dev',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
