import { describe, expect, it, vi } from 'vitest';
import { buildCanvasMenuItems, type CanvasMenuActions } from './canvas-menu.js';

/** 假 i18n：key 直接回显 */
const t = (key: string) => key;

const actions = (): CanvasMenuActions => ({
  cut: vi.fn(),
  copy: vi.fn(),
  paste: vi.fn(),
  selectAll: vi.fn(),
  duplicate: vi.fn(),
  deleteEntry: vi.fn(),
});

const labels = (items: ReturnType<typeof buildCanvasMenuItems>) =>
  items.map((i) => ('divider' in i && i.divider ? '—' : (i as { label: string }).label));

describe('buildCanvasMenuItems（#106 右键 / #127 删除条目）', () => {
  it('有选区 + 命中条目：剪切/复制/粘贴 — 全选 — 复制/删除条目', () => {
    const items = buildCanvasMenuItems({
      hasSelection: true,
      entry: { sectionId: 'sec1', entryId: 'e1' },
      actions: actions(),
      t,
    });
    expect(labels(items)).toEqual([
      'menu.editCut', 'menu.editCopy', 'menu.editPaste', '—', 'menu.editSelectAll', '—', 'editor.duplicateEntry', 'editor.deleteEntry',
    ]);
  });

  it('有选区 + 未命中条目：不出现条目操作', () => {
    const items = buildCanvasMenuItems({ hasSelection: true, entry: null, actions: actions(), t });
    expect(labels(items)).toEqual(['menu.editCut', 'menu.editCopy', 'menu.editPaste', '—', 'menu.editSelectAll']);
  });

  it('无选区 + 命中条目：复制/删除条目 — 粘贴/全选', () => {
    const items = buildCanvasMenuItems({
      hasSelection: false,
      entry: { sectionId: 'sec1', entryId: 'e1' },
      actions: actions(),
      t,
    });
    expect(labels(items)).toEqual(['editor.duplicateEntry', 'editor.deleteEntry', '—', 'menu.editPaste', 'menu.editSelectAll']);
  });

  it('无选区 + 空白处：粘贴/全选', () => {
    const items = buildCanvasMenuItems({ hasSelection: false, entry: null, actions: actions(), t });
    expect(labels(items)).toEqual(['menu.editPaste', 'menu.editSelectAll']);
  });

  it('菜单项带快捷键提示，且动作正确接线（含删除条目）', () => {
    const a = actions();
    const items = buildCanvasMenuItems({ hasSelection: true, entry: { sectionId: 's', entryId: 'e' }, actions: a, t });
    const hints = items.filter((i) => !('divider' in i && i.divider)).map((i) => (i as { hint?: string }).hint);
    expect(hints).toEqual(['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+A', 'Ctrl+D', undefined]);
    const run = (label: string) => {
      const item = items.find((i) => !('divider' in i && i.divider) && (i as { label: string }).label === label) as { run: () => void };
      item.run();
    };
    run('menu.editCut'); run('menu.editCopy'); run('menu.editPaste'); run('menu.editSelectAll');
    run('editor.duplicateEntry'); run('editor.deleteEntry');
    expect(a.cut).toHaveBeenCalledOnce();
    expect(a.copy).toHaveBeenCalledOnce();
    expect(a.paste).toHaveBeenCalledOnce();
    expect(a.selectAll).toHaveBeenCalledOnce();
    expect(a.duplicate).toHaveBeenCalledWith('s', 'e');
    expect(a.deleteEntry).toHaveBeenCalledWith('e');
  });
});
