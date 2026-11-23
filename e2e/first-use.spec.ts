import { expect, test } from '@playwright/test';

/**
 * 首用路径（#128）：清空示例 → 从零填写基本信息 → 导出被姓名拦截。
 * 这是「第一次使用能否写出自己的简历」的回归场景；
 * 浏览器模式持久层为内存实现，只验 UI 闭环，不验 SQLite/PDF。
 */
async function enterEditor(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('FL-XXXX-XXXX-XXXX').fill('FL-2026-Q4XY-8F3K');
  await page.getByRole('button', { name: '激活' }).click();
  const sample = page.getByRole('button', { name: '打开 示例简历' });
  await expect(sample).toBeVisible();
  await sample.click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
}

async function clearToBlank(page: import('@playwright/test').Page) {
  await page.locator('.sample-pill-clear').click();
  await page.getByRole('button', { name: '清空为空白简历' }).click();
  await expect(page.locator('.sample-pill')).toHaveCount(0);
}

test('首用：清空 → 添加基本信息字段 → 姓名未填时导出被拦', async ({ page }) => {
  await enterEditor(page);
  await clearToBlank(page);

  const basicSection = page.locator('section[data-type="fl-section"]').first();
  // NodeView 用 div 包裹（renderHTML 的 p 只是剪贴板镜像），按属性选
  const fields = page.locator('[data-type="fl-basic-field"]');
  await expect(fields).toHaveCount(0);

  // 空分区的入口必须常显（不靠悬停才发现）
  const addField = basicSection.getByRole('button', { name: '添加字段' });
  await expect(addField).toBeVisible();
  await expect(basicSection.locator('h3')).toHaveClass(/is-empty/);

  await addField.click();
  await expect(fields).toHaveCount(1);

  await fields.first().click();
  await page.keyboard.type('武汉 · 可即时到岗');
  await expect(basicSection).toContainText('武汉 · 可即时到岗');
  // 姓名仍为空 → 导出必须被拦截（而不是产出「你的姓名」的 PDF/归档）
  await page.getByRole('button', { name: '文件' }).click();
  await page.getByRole('menuitem', { name: '另存为归档…' }).click();
  // 清空回执可能还没消失，按文案定位而不是取唯一 .toast
  await expect(page.locator('.toast', { hasText: '请先填写姓名再导出' })).toBeVisible();
});

test('首用：库页底栏不显示编辑器保存状态与字数', async ({ page }) => {
  await enterEditor(page);
  await page.getByRole('button', { name: '返回简历库' }).click();
  await expect(page.getByRole('button', { name: '打开 示例简历' })).toBeVisible();
  await expect(page.locator('.statusbar')).not.toContainText('条要点');
  await expect(page.locator('.statusbar')).not.toContainText('已保存');
});
