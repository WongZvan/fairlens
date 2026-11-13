/**
 * 要点层级缩进（#123）：纯函数便于单测——Tiptap 命令里只做读写，夹取逻辑在此。
 * 深度 0–2（0=顶层）；未知/非法值按 0 处理（旧文档没有该属性）。
 */
export const BULLET_DEPTH_MAX = 2;

/** 当前深度（把 null/undefined/越界值归一为 0–2） */
export function normalizeBulletDepth(value: unknown): number {
  if (value === 1 || value === 2) return value;
  return 0;
}

/** Tab（+1）/ Shift+Tab（-1）后的深度；已在边界时返回原值（调用方仍需 preventDefault） */
export function nextBulletDepth(current: unknown, delta: 1 | -1): number {
  const base = normalizeBulletDepth(current);
  const next = base + delta;
  return next < 0 ? 0 : next > BULLET_DEPTH_MAX ? BULLET_DEPTH_MAX : next;
}