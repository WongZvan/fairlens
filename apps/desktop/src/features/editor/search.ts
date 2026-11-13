/**
 * 内联搜索（2026-11-13，#126）：纯函数 + PM 插件 + UI 三层分离。
 *
 * 纯函数层（本文件的 `findMatches`）：
 * - 输入 PM doc 与查询串，输出各匹配的 `{from, to}`（文档绝对位置，含 inline 节点）
 * - 大小写不敏感；CJK 直接逐字符匹配；跨 run/跨 mark 连续匹配（按 textContent 拼）
 * - 跳过 hardBreak 之外的非文本节点（本项目 inline 只有 text 与 hardBreak）
 * - 空查询返回空数组（调用方据此清零计数，不报错）
 *
 * 为什么不用 window.find / 浏览器原生查找：结果无法与 PM 位置对齐（无法做「当前项」高亮、
 * 无法在 match 之间循环跳转），且样式不受设计令牌控制（§12 禁用清单要求观感一致）。
 */
import type { Node as PMNode } from '@tiptap/pm/model';

export interface SearchMatch {
  /** 文档绝对位置（可直接用于 tr.setSelection / Decoration.inline） */
  from: number;
  to: number;
}

/**
 * 在 PM doc 中查找所有匹配。
 * 算法：遍历文本节点，把连续可匹配文本拼成「段」，在段内找子串，再映射回文档位置。
 * 段边界=块节点边界（不在两个 bullet 之间跨段匹配——简历场景下跨行匹配无意义）。
 */
export function findMatches(doc: PMNode, rawQuery: string): SearchMatch[] {
  const query = rawQuery.trim();
  if (!query) return [];
  const needle = query.toLowerCase();
  const matches: SearchMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // 文本块内：收集所有文本片段（跳过 hardBreak，用 '\n' 占位以保持位置连续）
    const segments: Array<{ text: string; from: number }> = [];
    let text = '';
    let cursor = pos + 1; // 进入块内的第一个位置
    node.forEach((child) => {
      if (child.isText && child.text) {
        segments.push({ text: child.text, from: cursor });
        text += child.text;
        cursor += child.nodeSize;
      } else if (child.type.name === 'hardBreak') {
        segments.push({ text: '\n', from: cursor });
        text += '\n';
        cursor += child.nodeSize;
      } else {
        cursor += child.nodeSize;
      }
    });
    if (!text) return false;

    const lower = text.toLowerCase();
    let index = lower.indexOf(needle);
    while (index !== -1) {
      const from = posOfIndex(segments, index);
      const toIndex = posOfIndex(segments, index + needle.length - 1);
      if (from !== null && toIndex !== null) {
        const to = toIndex + 1;
        if (to > from) matches.push({ from, to });
      }
      index = lower.indexOf(needle, index + Math.max(1, needle.length));
    }
    return false; // 文本块内部已处理完，不再下钻
  });

  return matches;
}

/** 段内字符下标 → 文档位置（跨段时取所在段的起始偏移） */
function posOfIndex(segments: Array<{ text: string; from: number }>, index: number): number | null {
  let consumed = 0;
  for (const seg of segments) {
    if (index < consumed + seg.text.length) return seg.from + (index - consumed);
    consumed += seg.text.length;
  }
  // 正好落在末尾（to 越界一位）：返回最后一个段尾
  const last = segments[segments.length - 1];
  return last ? last.from + last.text.length : null;
}

/** 循环取下一条（列表为空返回 -1） */
export function nextIndex(current: number, length: number): number {
  if (length <= 0) return -1;
  return (current + 1) % length;
}

/** 循环取上一条 */
export function prevIndex(current: number, length: number): number {
  if (length <= 0) return -1;
  return (current - 1 + length) % length;
}

/** 计数显示（1-based；无匹配显示 0/0） */
export function matchLabel(current: number, total: number): string {
  if (total <= 0) return '0/0';
  return `${current + 1}/${total}`;
}