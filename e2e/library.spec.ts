import { expect, test, type Page } from '@playwright/test';

/**
 * m1.8 简历库（#129）浏览器闭环：模板新建 / 重命名 / 归档筛选 / 删除→空态 / 切换保护。
 * 浏览器模式用内存持久层：这里只验 UI 与内存级联；SQLite 四表级联见人工验收 §14.3。
 */
async function enterLibrary(page: Page) {
  await page.goto('/');
  await page.getByLabel('FL-XXXX-XXXX-XXXX').fill('FL-2026-Q4XY-8F3K');
  await page.getByRole('button', { name: '激活' }).click();
  await expect(page.getByRole('button', { name: '打开 示例简历' })).toBeVisible();
}

async function createBlank(page: Page, tpl: 'tpl-classic' | 'tpl-duo' = 'tpl-classic', title = '我的简历') {
  await page.locator(`.lib-tpl[data-tpl="${tpl}"]`).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await page.getByRole('button', { name: '返回简历库' }).click();
  await expect(page.getByRole('button', { name: `打开 ${title}` })).toBeVisible();
}

test('模板卡新建第二份：示例仍在，新简历为空且模板正确', async ({ page }) => {
  await enterLibrary(page);
  await page.locator('.lib-tpl[data-tpl="tpl-duo"]').click();
  await expect(page.locator('.fl-host')).toHaveAttribute('data-template', 'tpl-duo');
  await expect(page.locator('.ProseMirror')).not.toContainText('李思远');

  await page.getByRole('button', { name: '返回简历库' }).click();
  await expect(page.getByRole('button', { name: '打开 示例简历' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开 我的简历' })).toBeVisible();
});

test('重命名：空标题留在框内报错，保存后卡片更新', async ({ page }) => {
  await enterLibrary(page);
  await createBlank(page);

  await page.getByRole('button', { name: '卡片操作：我的简历' }).click();
  await page.getByRole('menuitem', { name: '重命名…' }).click();
  const input = page.locator('.meta-win input');
  await input.fill('   ');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('标题不能为空')).toBeVisible();

  await input.fill('求职版');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('button', { name: '打开 求职版' })).toBeVisible();
});

test('归档：默认隐藏、显示归档可见且置灰、可取消', async ({ page }) => {
  await enterLibrary(page);
  await createBlank(page);

  await page.getByRole('button', { name: '卡片操作：我的简历' }).click();
  await page.getByRole('menuitem', { name: '归档' }).click();
  await expect(page.getByRole('button', { name: '打开 我的简历' })).toHaveCount(0);

  await page.locator('.lib-switch input').check({ force: true });
  const card = page.getByRole('button', { name: '打开 我的简历' });
  await expect(card).toBeVisible();
  await expect(card.locator('xpath=..')).toHaveClass(/is-archived/);

  await page.getByRole('button', { name: '卡片操作：我的简历' }).click();
  await page.getByRole('menuitem', { name: '取消归档' }).click();
  await page.locator('.lib-switch input').uncheck({ force: true });
  await expect(page.getByRole('button', { name: '打开 我的简历' })).toBeVisible();
});

test('删除：确认框列快照数；删光进入空态且导入区不可点', async ({ page }) => {
  await enterLibrary(page);
  await createBlank(page);

  for (const title of ['我的简历', '示例简历']) {
    await page.getByRole('button', { name: `卡片操作：${title}` }).click();
    await page.getByRole('menuitem', { name: '删除…' }).click();
    await expect(page.locator('.guard-box')).toContainText('个快照');
    await page.getByRole('button', { name: '删除', exact: true }).click();
  }

  await expect(page.locator('.lib-empty-card')).toContainText('还没有简历');
  await expect(page.locator('.lib-cards .lib-card')).toHaveCount(0);
  await expect(page.locator('.lib-tpl')).toHaveCount(3);
  await expect(page.locator('.lib-import')).toHaveCount(0);
});

test('切换保护：取消留在编辑器；不保存丢弃改动，另一份不受影响', async ({ page }) => {
  await enterLibrary(page);
  await page.locator('.lib-tpl[data-tpl="tpl-classic"]').click();
  await expect(page.locator('.ProseMirror')).toBeVisible();

  // 空白基本信息先加一个字段，写入第一段内容（自动保存）
  await page.getByRole('button', { name: '添加字段' }).click();
  const field = page.locator('[data-type="fl-basic-field"]');
  await expect(field).toHaveCount(1);
  await field.click();
  await page.keyboard.press('End');
  await page.keyboard.type('FIRST-KEEP');
  await page.waitForTimeout(900); // 等自动保存

  // 切手动模式，再写一段“将被丢弃”的内容
  await page.getByRole('switch', { name: '自动保存' }).click();
  await expect(page.getByRole('switch', { name: '手动保存' })).toBeVisible();
  await field.click();
  await page.keyboard.press('End');
  await page.keyboard.type('SECOND-DISCARD');

  await page.getByRole('button', { name: '返回简历库' }).click();
  await expect(page.getByText('你有尚未保存的更改。')).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.locator('.ProseMirror')).toBeVisible();

  await page.getByRole('button', { name: '返回简历库' }).click();
  await page.getByRole('button', { name: '不保存' }).click();
  await expect(page.getByRole('button', { name: '打开 我的简历' })).toBeVisible();

  await page.getByRole('button', { name: '打开 我的简历' }).click();
  await expect(page.locator('.ProseMirror')).toContainText('FIRST-KEEP');
  await expect(page.locator('.ProseMirror')).not.toContainText('SECOND-DISCARD');

  await page.getByRole('button', { name: '返回简历库' }).click();
  await page.getByRole('button', { name: '打开 示例简历' }).click();
  await expect(page.locator('.ProseMirror')).toContainText('李思远');
  await expect(page.locator('.ProseMirror')).not.toContainText('FIRST-KEEP');
});
