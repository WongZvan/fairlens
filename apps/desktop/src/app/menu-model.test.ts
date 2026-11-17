import { describe, expect, it } from 'vitest';
import { buildMenus, findItem, flattenItems, type MenuContext } from './menu-model.js';

/** 假 i18n：key 直接回显，便于断言结构而非文案 */
const t = (key: string) => key;
const baseCtx: MenuContext = { inEditor: true, theme: 'system', zoomMode: 'fit-width' };

describe('命令栏菜单模型（#124）', () => {
  it('四个顶级菜单：文件/编辑/视图/AI', () => {
    const menus = buildMenus(t, baseCtx);
    expect(menus.map((m) => m.id)).toEqual(['file', 'edit', 'view', 'ai']);
  });

  it('未实现项一律 disabled + 「未开放」徽标 + 人话说明（#127，不再显示里程碑编号）', () => {
    const menus = buildMenus(t, baseCtx);
    const newItem = findItem(menus, 'file.new');
    const openItem = findItem(menus, 'file.open');
    const word = findItem(menus, 'file.export-word');
    const evaluate = findItem(menus, 'ai.evaluate');
    expect(newItem).toMatchObject({ disabled: true, badge: 'menu.unavailable', note: 'menu.noteNewOpen' });
    expect(openItem).toMatchObject({ disabled: true, badge: 'menu.unavailable', note: 'menu.noteNewOpen' });
    expect(word).toMatchObject({ disabled: true, badge: 'menu.unavailable', note: 'menu.noteExportFormats' });
    expect(evaluate).toMatchObject({ disabled: true, badge: 'menu.unavailable', note: 'menu.noteAi' });
    // 界面上不得再出现里程碑编号
    const all = menus.flatMap((m) => flattenItems(m.items));
    expect(all.some((i) => i.badge && /^m\d|^M\d/.test(i.badge))).toBe(false);
  });

  it('已实现项不带 badge 且默认可用（PDF 导出/保存/快照/查找）', () => {
    const menus = buildMenus(t, baseCtx);
    for (const id of ['file.export-pdf', 'file.save', 'file.snapshot-create', 'edit.find', 'file.export-archive'] as const) {
      const item = findItem(menus, id);
      expect(item, id).toBeDefined();
      expect(item!.disabled, id).toBeFalsy();
      expect(item!.badge, id).toBeUndefined();
    }
  });

  it('library 视图下编辑器相关项全部禁用', () => {
    const menus = buildMenus(t, { ...baseCtx, inEditor: false });
    for (const id of ['file.save', 'edit.undo', 'edit.find', 'view.toggle-left', 'file.export-pdf'] as const) {
      expect(findItem(menus, id)!.disabled, id).toBe(true);
    }
    // 返回简历库/关闭窗口不受视图影响
    expect(findItem(menus, 'file.back-library')!.disabled).toBeFalsy();
    expect(findItem(menus, 'file.close')!.disabled).toBeFalsy();
  });

  it('主题三项按当前模式打勾', () => {
    const menus = buildMenus(t, { ...baseCtx, theme: 'dark' });
    expect(findItem(menus, 'view.theme-dark')!.hint).toBe('✓');
    expect(findItem(menus, 'view.theme-light')!.hint).toBeUndefined();
  });

  it('导出子菜单按 §9 分组：PDF + 归档可用，其余未开放（#127 归档并入导出下拉）', () => {
    const menus = buildMenus(t, baseCtx);
    const exportGroup = menus.find((m) => m.id === 'file')!.items.find((i) => i.submenu)!;
    const ids = exportGroup.submenu!.map((s) => s.id);
    expect(ids).toEqual(['file.export-pdf', 'file.export-archive', 'file.export-word', 'file.export-pdf-annotated', 'file.export-png', 'file.export-html']);
    expect(exportGroup.submenu!.filter((s) => !s.disabled).map((s) => s.id)).toEqual(['file.export-pdf', 'file.export-archive']);
  });

  it('视图菜单按真实缩放档位打勾（#127 修写死 fit-width）', () => {
    const menus = buildMenus(t, { ...baseCtx, zoomMode: 1 });
    expect(findItem(menus, 'view.zoom-100')!.hint).toBe('✓');
    expect(findItem(menus, 'view.zoom-fit-width')!.hint).toBeUndefined();
    const fitPage = buildMenus(t, { ...baseCtx, zoomMode: 'fit-page' });
    expect(findItem(fitPage, 'view.zoom-fit-page')!.hint).toBe('✓');
  });

  it('flattenItems 展开子菜单（命令查找用）', () => {
    const menus = buildMenus(t, baseCtx);
    const all = flattenItems(menus.find((m) => m.id === 'file')!.items);
    expect(all.some((i) => i.id === 'file.export-pdf')).toBe(true);
  });
});