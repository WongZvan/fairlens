/**
 * 悬浮工具条可达性几何（m1.6 反馈轮 #106）：纯函数、无 DOM 依赖，供单测锁定。
 * 背景：旧判定框只取选区两端光标 ±4px，而工具条悬在选区上方 8px —— 移动途中 4px 死区使工具条永远够不到。
 * 现判定 = 选区矩形 ∪ 工具条自身矩形 ∪ 过渡走廊。
 */

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

/** DOMRectList → 纯矩形数组（丢弃零宽行：换行处会产出宽度为 0 的空 rect） */
export function rectsFromClientRects(
  list: ArrayLike<{ left: number; top: number; right: number; bottom: number }>,
): Rect[] {
  const out: Rect[] = [];
  for (const r of Array.from(list)) {
    if (r.right - r.left <= 0) continue;
    out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  return out;
}

/** 端点包围盒（DOM selection 不可用时的退化路径） */
export function rectsFromEndpoints(a: Point, b: Point): Rect[] {
  return [
    {
      left: Math.min(a.x, b.x),
      top: Math.min(a.y, b.y),
      right: Math.max(a.x, b.x),
      bottom: Math.max(a.y, b.y),
    },
  ];
}

/** 点是否落在任一矩形内（pad=四边外扩量） */
export function pointInRects(p: Point, rects: Rect[], pad = 0): boolean {
  return rects.some(
    (r) => p.x >= r.left - pad && p.x <= r.right + pad && p.y >= r.top - pad && p.y <= r.bottom + pad,
  );
}

/**
 * 选区与工具条之间的过渡走廊（保证鼠标能从选区一路走到工具条）：
 * - 工具条在上方：从工具条底边到选区顶边
 * - 工具条在下方（flip）：从选区底边到工具条顶边
 * - 二者重叠或缺少任一：无走廊
 */
export function corridorBetween(selection: Rect[], toolbar: Rect | null): Rect | null {
  if (!toolbar || selection.length === 0) return null;
  const left = Math.min(toolbar.left, ...selection.map((r) => r.left));
  const right = Math.max(toolbar.right, ...selection.map((r) => r.right));
  const selTop = Math.min(...selection.map((r) => r.top));
  const selBottom = Math.max(...selection.map((r) => r.bottom));
  if (toolbar.bottom <= selTop) return { left, top: toolbar.bottom, right, bottom: selTop };
  if (toolbar.top >= selBottom) return { left, top: selBottom, right, bottom: toolbar.top };
  return null;
}

/** 完整可达区：选区 ∪ 工具条 ∪ 走廊 */
export function reachableRects(selection: Rect[], toolbar: Rect | null): Rect[] {
  const rects = [...selection];
  if (toolbar) rects.push(toolbar);
  const corridor = corridorBetween(selection, toolbar);
  if (corridor) rects.push(corridor);
  return rects;
}
