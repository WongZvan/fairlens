/**
 * 快捷键路由（m1.5，docs/01 §5.6 全表）：
 * - 编辑器内：Ctrl+Enter 块修订 / Ctrl+Shift+V 仅文本粘贴 / Alt+↓↑ 批注导航（挂编辑器）
 * - 全局：Ctrl+K 命令面板 / Ctrl+Shift+K 插链接 / Ctrl+S 保存 / Ctrl+D 复制块
 *          / Ctrl+Shift+E 评估 / Ctrl+F 查找（m1.5 内联简化版）
 * IME 合成态一律不路由（m1.4 尾项）——中文输入期间 Enter/组合键不误触。
 * #127：同一键不再承担两种语义（原 Ctrl+K 有选区=链接，与"命令面板"心智冲突）。
 * 单测：editor/shortcuts.test.ts（纯函数判定）
 */
import { isComposingKey } from './ime.js';

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

/**
 * #127：全局快捷键守卫——在输入框/文本域/下拉里或有浮层打开时，除 Esc 外一律不处理。
 * 编辑器正文也是 contenteditable，但它是快捷键的主要使用场景，不能一刀切排除。
 */
export function shouldIgnoreShortcut(target: EventTarget | null, hasOverlay: boolean): boolean {
  if (hasOverlay) return true;
  if (!target) return false;
  // 事件可能派发在 window/document 上（不是 Element）：没有 tagName 就不拦
  const tag = (target as { tagName?: unknown }).tagName;
  if (typeof tag !== 'string') return false;
  const name = tag.toLowerCase();
  return name === 'input' || name === 'textarea' || name === 'select';
}

/** 纯函数：键盘事件语义 → 动作（React 层只做 preventDefault 与执行） */
export function resolveShortcut(
  e: {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    key: string;
    isComposing?: boolean;
    keyCode?: number;
  },
  ctx: ShortcutContext,
): ShortcutAction {
  if (isComposingKey(e)) return null;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  if (ctrl && e.shiftKey && k === 'e') return 'evaluate';
  if (ctrl && e.shiftKey && k === 'v') return 'paste-plain';
  if (ctrl && e.shiftKey && k === 'k') return ctx.inEditor ? 'insert-link' : null;
  if (ctrl && k === 's') return 'save';
  if (ctrl && k === 'd') return 'duplicate-block';
  if (ctrl && k === 'f') return 'find';
  if (ctrl && k === 'k') return 'command-palette';
  if (ctrl && k === 'enter') return ctx.inEditor ? 'revise-block' : null;
  if (e.altKey && k === 'arrowdown') return 'annotation-next';
  if (e.altKey && k === 'arrowup') return 'annotation-prev';
  return null;
}
