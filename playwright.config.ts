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
    // 用 exec 而不是 run：`pnpm run dev -- --host …` 会把 `--` 原样传给 vite
    // （实测 `vite "--" "--host" …`），参数不生效；exec 直接透传 argv。
    // 显式绑 IPv4：Linux runner 上 localhost 可能只解析到 ::1，Playwright 等的是 127.0.0.1。
    command: 'pnpm --filter @fairlens/desktop exec vite --host 127.0.0.1',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
