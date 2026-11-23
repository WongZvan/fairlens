import { expect, test } from '@playwright/test';

/**
 * 关键路径冒烟（§14-M1）：激活 → 库页打开示例 → 编辑要点 → 切模板 → 保存。
 * 断言只用结构化钩子（`data-template`、`.toast`），不做像素比对。
 * 注意：浏览器模式持久层是内存实现，「保存」只验回执，不验落盘（SQLite 见人工验收 §4）。
 */
test('关键路径：激活 → 打开示例 → 编辑 → 切模板 → 保存', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('FL-XXXX-XXXX-XXXX').fill('FL-2026-Q4XY-8F3K');
  await page.getByRole('button', { name: '激活' }).click();
  const sample = page.getByRole('button', { name: '打开 示例简历' });
  await expect(sample).toBeVisible();
  await sample.click();

  const bullet = page.locator('li[data-type="fl-bullet"]').first();
  await expect(bullet).toBeVisible();
  await bullet.click();
  await page.keyboard.type('E2E smoke bullet');
  await expect(page.locator('.ProseMirror')).toContainText('E2E smoke bullet');

  await page.getByRole('button', { name: /切换模板/ }).click();
  await page.getByRole('option', { name: '侧栏双栏' }).click();
  await expect(page.locator('.fl-host')).toHaveAttribute('data-template', 'tpl-duo');

  await page.locator('.ProseMirror').click();
  await page.keyboard.press('Control+s');
  await expect(page.locator('.toast')).toContainText('已保存');
});
