/**
 * 画布右键菜单项构建（#93 / #106 / #127）：纯函数，便于单测锁定顺序与条件。
 * 文案走 i18n（#127 清理硬编码）；命中条目时给「复制 / 删除」。
 */
import type { ContextMenuEntry } from './ContextMenu.js';

export interface CanvasMenuActions {
  cut: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  duplicate: (sectionId: string, entryId: string) => void;
  /** #127：删除条目（可 Ctrl+Z 撤销） */
  deleteEntry: (entryId: string) => void;
}

export interface CanvasMenuCtx {
  hasSelection: boolean;
  entry: { sectionId: string; entryId: string } | null;
  actions: CanvasMenuActions;
  t: (key: string) => string;
}

export function buildCanvasMenuItems({ hasSelection, entry, actions, t }: CanvasMenuCtx): ContextMenuEntry[] {
  const divider: ContextMenuEntry = { divider: true };
  const duplicate: ContextMenuEntry | null =
    entry && entry.sectionId
      ? { label: t('editor.duplicateEntry'), hint: 'Ctrl+D', run: () => actions.duplicate(entry.sectionId, entry.entryId) }
      : null;
  const remove: ContextMenuEntry | null = entry ? { label: t('editor.deleteEntry'), run: () => actions.deleteEntry(entry.entryId) } : null;
  const items: ContextMenuEntry[] = [];

  if (hasSelection) {
    items.push(
      { label: t('menu.editCut'), hint: 'Ctrl+X', run: actions.cut },
      { label: t('menu.editCopy'), hint: 'Ctrl+C', run: actions.copy },
      { label: t('menu.editPaste'), hint: 'Ctrl+V', run: actions.paste },
      divider,
      { label: t('menu.editSelectAll'), hint: 'Ctrl+A', run: actions.selectAll },
    );
    if (duplicate) items.push(divider, duplicate);
    if (remove) items.push(remove);
    return items;
  }

  if (duplicate) items.push(duplicate);
  if (remove) {
    items.push(remove, divider);
    items.push(
      { label: t('menu.editPaste'), hint: 'Ctrl+V', run: actions.paste },
      { label: t('menu.editSelectAll'), hint: 'Ctrl+A', run: actions.selectAll },
    );
    return items;
  }
  items.push(
    { label: t('menu.editPaste'), hint: 'Ctrl+V', run: actions.paste },
    { label: t('menu.editSelectAll'), hint: 'Ctrl+A', run: actions.selectAll },
  );
  return items;
}
