/**
 * 粘贴气泡定位（m1.4 尾项）：fixed 坐标 + 视口 clamp。
 * 画布 zoom 是 transform，气泡必须 portal 到 body 后用 fixed（#106 教训）；
 * 这里只做纯几何，实际渲染见 PasteBubble.tsx。
 */
export interface BubbleAnchor {
  left: number;
  top: number;
  bottom: number;
}

export interface BubbleSize {
  width: number;
  height: number;
}

export interface BubbleViewport {
  width: number;
  height: number;
}

export interface BubblePlacement {
  left: number;
  top: number;
  placement: 'below' | 'above';
}

export const PASTE_BUBBLE_TIMEOUT_MS = 4000;
export const BUBBLE_VIEWPORT_MARGIN = 8;
export const BUBBLE_GAP = 8;

export function placeBubble(
  anchor: BubbleAnchor,
  size: BubbleSize,
  viewport: BubbleViewport,
  gap = BUBBLE_GAP,
  margin = BUBBLE_VIEWPORT_MARGIN,
): BubblePlacement {
  const maxLeft = Math.max(margin, viewport.width - size.width - margin);
  const left = Math.min(Math.max(margin, anchor.left), maxLeft);

  const below = anchor.bottom + gap;
  const above = anchor.top - gap - size.height;
  const fitsBelow = below + size.height <= viewport.height - margin;
  if (fitsBelow) return { left, top: below, placement: 'below' };

  return { left, top: Math.max(margin, above), placement: 'above' };
}
