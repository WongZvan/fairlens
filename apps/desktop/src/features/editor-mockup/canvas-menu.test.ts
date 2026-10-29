import { describe, expect, it, vi } from 'vitest';
import { buildCanvasMenuItems, type CanvasMenuActions } from './canvas-menu.js';

const actions = (): CanvasMenuActions => ({
  cut: vi.fn(),
  copy: vi.fn(),
  paste: vi.fn(),
  selectAll: vi.fn(),
  duplicate: vi.fn(),
});

const labels = (items: ReturnType<typeof buildCanvasMenuItems>) =>
  items.map((i) => ('divider' in i && i.divider ? '—' : (i as { label: string }).label));

describe('buildCanvasMenuItems（#106 右键四项）', () => {
  it('有选区 + 命中条目：剪切/复制/粘贴 — 全选 — 创建条目副本', () => {
    const items = buildCanvasMenuItems({
      hasSelection: true,
      entry: { sectionId: 'sec1', entryId: 'e1' },
      actions: actions(),
    });
    expect(labels(items)).toEqual(['剪切', '复制', '粘贴', '—', '全选', '—', '创建条目副本']);
  });

  it('有选区 + 未命中条目：不出现创建条目副本', () => {
    const items = buildCanvasMenuItems({ hasSelection: true, entry: null, actions: actions() });
    expect(labels(items)).toEqual(['剪切', '复制', '粘贴', '—', '全选']);
  });

  it('无选区 + 命中条目：创建条目副本 — 粘贴/全选', () => {
    const items = buildCanvasMenuItems({
      hasSelection: false,
      entry: { sectionId: 'sec1', entryId: 'e1' },
      actions: actions(),
    });
    expect(labels(items)).toEqual(['创建条目副本', '—', '粘贴', '全选']);
  });

  it('无选区 + 空白处：粘贴/全选', () => {
    const items = buildCanvasMenuItems({ hasSelection: false, entry: null, actions: actions() });
    expect(labels(items)).toEqual(['粘贴', '全选']);
  });

  it('菜单项带快捷键提示（显式告知），且动作正确接线', () => {
    const a = actions();
    const items = buildCanvasMenuItems({ hasSelection: true, entry: { sectionId: 's', entryId: 'e' }, actions: a });
    const hints = items.filter((i) => !('divider' in i && i.divider)).map((i) => (i as { hint?: string }).hint);
    expect(hints).toEqual(['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+A', 'Ctrl+D']);
    const run = (label: string) => {
      const it = items.find((i) => !('divider' in i && i.divider) && (i as { label: string }).label === label) as { run: () => void };
      it.run();
    };
    run('剪切'); run('复制'); run('粘贴'); run('全选'); run('创建条目副本');
    expect(a.cut).toHaveBeenCalledOnce();
    expect(a.copy).toHaveBeenCalledOnce();
    expect(a.paste).toHaveBeenCalledOnce();
    expect(a.selectAll).toHaveBeenCalledOnce();
    expect(a.duplicate).toHaveBeenCalledWith('s', 'e');
  });
});
