/**
 * 画布右键菜单项构建（#93 / #106）：纯函数，便于单测锁定顺序与条件。
 * 语义（#106 修订 #93）：选区态提供剪切/复制/粘贴/全选（显式告诉用户快捷键）；
 * 条目命中的「创建条目副本」是**原地副本**（非剪贴板复制），与 Ctrl+D 同源。
 */
import type { ContextMenuEntry } from './ContextMenu.js';

export interface CanvasMenuActions {
  cut: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  duplicate: (sectionId: string, entryId: string) => void;
}

export interface CanvasMenuCtx {
  hasSelection: boolean;
  entry: { sectionId: string; entryId: string } | null;
  actions: CanvasMenuActions;
}

export function buildCanvasMenuItems({ hasSelection, entry, actions }: CanvasMenuCtx): ContextMenuEntry[] {
  const duplicate: ContextMenuEntry | null =
    entry && entry.sectionId
      ? { label: '创建条目副本', hint: 'Ctrl+D', run: () => actions.duplicate(entry.sectionId, entry.entryId) }
      : null;
  const divider: ContextMenuEntry = { divider: true };
  const items: ContextMenuEntry[] = [];

  if (hasSelection) {
    items.push(
      { label: '剪切', hint: 'Ctrl+X', run: actions.cut },
      { label: '复制', hint: 'Ctrl+C', run: actions.copy },
      { label: '粘贴', hint: 'Ctrl+V', run: actions.paste },
      divider,
      { label: '全选', hint: 'Ctrl+A', run: actions.selectAll },
    );
    if (duplicate) items.push(divider, duplicate);
    return items;
  }

  if (duplicate) items.push(duplicate, divider);
  items.push(
    { label: '粘贴', hint: 'Ctrl+V', run: actions.paste },
    { label: '全选', hint: 'Ctrl+A', run: actions.selectAll },
  );
  return items;
}
