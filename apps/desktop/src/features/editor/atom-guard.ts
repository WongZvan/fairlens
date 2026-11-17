/**
 * 结构锚点守卫（#127）：防止 Backspace/Delete 把页头、条目头、分区标题整块删掉。
 *
 * 根因（2026-11-17 审计）：页头/条目头是 `atom: true` 且不可选中；ProseMirror 默认
 * `joinBackward` 对前置 atom 有"直接删除"分支，而本产品没有任何自定义 Backspace。
 * 用户在第一个分区标题行首或第一条要点行首按 Backspace，页头/profile 与条目头会消失，
 * 800ms 后自动保存落盘——不可撤销窗口极短。
 *
 * 规则（纯函数，便于单测）：
 * - Backspace：只有"最近的上一块是结构锚点"才拦（pageHeader / entryHeader / sectionHeader /
 *   photoSlot / skillGroup）；上一条要点、上一个字段仍允许默认合并。
 * - Delete：最近的下一块不是要点（且不是行内节点）就拦——避免把下一条目/下一分区并进当前块。
 */
import { Extension } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import type { Node as PMDocNode, ResolvedPos } from '@tiptap/pm/model';

/** 不可被 Backspace 合并掉的锚点块 */
const PROTECTED_BEFORE = new Set(['flPageHeader', 'flEntryHeader', 'flSectionHeader', 'flPhotoSlot', 'flSkillGroup']);

function nearestSibling($pos: ResolvedPos, dir: -1 | 1): PMDocNode | null {
  // 从当前文本块向上逐层找"最近的兄弟块"；找不到就继续往上（跨分区/跨条目边界）
  for (let d = $pos.depth; d >= 1; d -= 1) {
    const parent = $pos.node(d - 1);
    const base = d === 1 ? 0 : $pos.start(d - 1);
    const rel = $pos.before(d) - base;
    // Fragment.findIndex 把"紧邻某子节点起点的边界"算作前一个子节点，这里要的是
    // "起点恰为 rel 的子节点" 的索引，所以手写偏移累加（#127 实测：用 findIndex 会漏掉 header）
    let index = -1;
    let offset = 0;
    for (let i = 0; i < parent.childCount; i += 1) {
      if (offset === rel) {
        index = i;
        break;
      }
      offset += parent.child(i).nodeSize;
    }
    if (index === -1) continue; // rel 落在内容末尾（不可能有兄弟）→ 继续向上
    const sib = dir < 0 ? (index > 0 ? parent.child(index - 1) : null) : index + 1 < parent.childCount ? parent.child(index + 1) : null;
    if (sib) return sib;
  }
  return null;
}

export function shouldBlockAtomDeletion(state: EditorState, dir: 'back' | 'forward'): boolean {
  const { selection } = state;
  if (!selection.empty) return false;
  const $pos = selection.$from;

  if (dir === 'back') {
    if ($pos.parentOffset !== 0) return false;
    const prev = nearestSibling($pos, -1);
    return !!prev && PROTECTED_BEFORE.has(prev.type.name);
  }

  if ($pos.parentOffset !== $pos.parent.content.size) return false;
  const next = nearestSibling($pos, 1);
  // 行内节点（文本/hardBreak）不拦；要点之间合并允许；其余块级节点一律拦
  if (!next || next.isText || !next.isBlock) return false;
  return next.type.name !== 'flBullet';
}

export const AtomGuard = Extension.create({
  name: 'flAtomGuard',
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        if (this.editor.view.composing) return false; // IME 组合态不拦
        return shouldBlockAtomDeletion(this.editor.state, 'back');
      },
      Delete: () => {
        if (this.editor.view.composing) return false;
        return shouldBlockAtomDeletion(this.editor.state, 'forward');
      },
    };
  },
});
