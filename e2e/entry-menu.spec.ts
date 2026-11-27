import { expect, test } from '@playwright/test';

/**
 * 条目头菜单回归（#130）：
 * - 键盘 Enter/空格打开 ⋯ 菜单，不误开「编辑条目信息」；Esc 关闭并回到按钮。
 * - 鼠标从 ⋯ → 复制条目；达到建议上限弹确认，取消不新增、确认后新增。
 *
 * 浏览器模式（内存持久层），不覆盖 SQLite/真窗；真窗验收见 acceptance/M1.md §7。
 */
test('条目头 ⋯：键盘可打开/关闭，不误开编辑框', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('FL-XXXX-XXXX-XXXX').fill('FL-2026-Q4XY-8F3K');
  await page.getByRole('button', { name: '激活' }).click();
  await page.getByRole('button', { name: '打开 示例简历' }).click();

  const head = page.locator('.fl-entry-head').first();
  const more = head.locator('button[aria-label="条目操作"]');
  await expect(more).toBeVisible();

  await more.focus();
  await page.keyboard.press('Enter');
  const menu = page.locator('.ctx-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '复制条目' })).toBeVisible();
  await expect(page.locator('.meta-overlay')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();

  await more.focus();
  await page.keyboard.press(' ');
  await expect(menu).toBeVisible();
  await expect(page.locator('.meta-overlay')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});

test('达到建议上限：取消不新增，确认后新增', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('FL-XXXX-XXXX-XXXX').fill('FL-2026-Q4XY-8F3K');
  await page.getByRole('button', { name: '激活' }).click();
  await page.getByRole('button', { name: '打开 示例简历' }).click();

  const section = page.locator('.fl-section').filter({ has: page.locator('.fl-entry-head') }).first();
  const count = () => section.locator('.fl-entry-head').count();
  const more = () => section.locator('.fl-entry-head').first().locator('button[aria-label="条目操作"]');
  const guard = page.locator('.guard-box');

  // 连续复制直到触发上限确认（上限 8 由 manifest 决定；最多试 8 次）
  for (let i = 0; i < 8 && !(await guard.isVisible()); i += 1) {
    await more().click();
    await page.locator('.ctx-menu').getByRole('menuitem', { name: '复制条目' }).click();
    await expect(guard).toBeVisible({ timeout: 3000 }).catch(() => {});
  }
  await expect(guard).toBeVisible();
  await expect(guard).toContainText('已到建议上限');

  const before = await count();
  await guard.getByRole('button', { name: '取消' }).click();
  await expect(guard).toHaveCount(0);
  await expect.poll(count).toBe(before);

  await more().click();
  await page.locator('.ctx-menu').getByRole('menuitem', { name: '复制条目' }).click();
  await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: '仍然复制' }).click();
  await expect(guard).toHaveCount(0);
  await expect.poll(count).toBe(before + 1);
});
