/**
 * 快捷键路由（m1.5，docs/01 §5.10 全表）：
 * - 编辑器内：Ctrl+Enter 块修订 / Ctrl+Shift+V 仅文本粘贴 / Alt+↓↑ 批注导航（挂编辑器）
 * - 全局：Ctrl+K 二义（选区=插链接[编辑器内]/无选区=命令面板）/ Ctrl+S 保存 / Ctrl+D 复制块
 *          / Ctrl+Shift+E 评估 / Ctrl+F 查找（m1.5 内联简化版）
 * 单测：editor/shortcuts.test.ts（纯函数判定）
 */

export interface ShortcutContext {
  hasSelection: boolean;
  inEditor: boolean;
}

export type ShortcutAction =
  | 'command-palette'
  | 'insert-link'
  | 'save'
  | 'duplicate-block'
  | 'evaluate'
  | 'revise-block'
  | 'paste-plain'
  | 'find'
  | 'annotation-next'
  | 'annotation-prev'
  | null;

/** 纯函数：键盘事件语义 → 动作（React 层只做 preventDefault 与执行） */
export function resolveShortcut(
  e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; key: string },
  ctx: ShortcutContext,
): ShortcutAction {
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  if (ctrl && e.shiftKey && k === 'e') return 'evaluate';
  if (ctrl && e.shiftKey && k === 'v') return 'paste-plain';
  if (ctrl && k === 's') return 'save';
  if (ctrl && k === 'd') return 'duplicate-block';
  if (ctrl && k === 'f') return 'find';
  if (ctrl && k === 'k') return ctx.inEditor && ctx.hasSelection ? 'insert-link' : 'command-palette';
  if (ctrl && k === 'enter') return ctx.inEditor ? 'revise-block' : null;
  if (e.altKey && k === 'arrowdown') return 'annotation-next';
  if (e.altKey && k === 'arrowup') return 'annotation-prev';
  return null;
}
