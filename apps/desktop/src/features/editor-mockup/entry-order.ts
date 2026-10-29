import type { Entry } from '@fairlens/shared';

/**
 * 条目换序（#107）：抽成纯函数，避免原地索引替换的越界/自赋值写法。
 * 越界或同位返回原数组（调用方据此跳过更新），不做 silent 修正。
 */
export function moveEntry(entries: Entry[], from: number, to: number): Entry[] {
  if (from === to) return entries;
  if (from < 0 || to < 0 || from >= entries.length || to >= entries.length) return entries;
  const next = [...entries];
  const [moved] = next.splice(from, 1);
  if (!moved) return entries;
  next.splice(to, 0, moved);
  return next;
}
