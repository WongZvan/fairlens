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
  // 新增字段后直接打字：光标应落在新字段值末尾
  await expect(page.locator('.ProseMirror')).toBeFocused();
  await page.keyboard.type('武汉 · 可即时到岗');
  await expect(fields.first()).toContainText('武汉 · 可即时到岗');

  // 先把光标移到别处，再点字段行（不按 End）直接打字：靠字段行本身聚焦
  await page.keyboard.press('Control+Home');
  const fieldBox = await fields.first().boundingBox();
  await fields.first().click({ position: { x: Math.max(4, (fieldBox?.width ?? 40) - 6), y: (fieldBox?.height ?? 20) / 2 } });
  await expect(page.locator('.ProseMirror')).toBeFocused();
  await page.keyboard.type('（补充）');
  await expect(fields.first()).toHaveText(/武汉 · 可即时到岗\s*（补充）/);

  // 字段行铅笔 → 弹窗输入：鼠标点输入框 + 键盘输入，不得写进纸面字段值
  await fields.first().getByLabel('编辑字段').click();
  const hrefInput = page.getByLabel('链接（可选）');
  await hrefInput.click();
  await page.keyboard.type('https://example.com');
  await expect(hrefInput).toHaveValue('https://example.com');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(fields.first()).not.toContainText('https://example.com');
  await expect(fields.first()).toHaveText(/武汉 · 可即时到岗\s*（补充）/);
  // 姓名仍为空 → 导出必须被拦截（而不是产出「你的姓名」的 PDF/归档）
  await page.getByRole('button', { name: '文件' }).click();
  await page.getByRole('menuitem', { name: '另存为归档…' }).click();
  // 清空回执可能还没消失，按文案定位而不是取唯一 .toast
  await expect(page.locator('.toast', { hasText: '请先填写姓名再导出' })).toBeVisible();

  // 清空 = 释放样本身份：返回库页后该卡不再有「示例」徽标
  await page.getByRole('button', { name: '返回简历库' }).click();
  await expect(page.getByRole('button', { name: '打开 我的简历' })).toBeVisible();
  await expect(page.locator('.lib-badge')).toHaveCount(0);
});

test('首用：库页底栏不显示编辑器保存状态与字数', async ({ page }) => {
  await enterEditor(page);
  await page.getByRole('button', { name: '返回简历库' }).click();
  await expect(page.getByRole('button', { name: '打开 示例简历' })).toBeVisible();
  await expect(page.locator('.statusbar')).not.toContainText('条要点');
  await expect(page.locator('.statusbar')).not.toContainText('已保存');
});
