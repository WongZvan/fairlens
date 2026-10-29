import { describe, expect, it } from 'vitest';
import {
  corridorBetween,
  pointInRects,
  reachableRects,
  rectsFromClientRects,
  rectsFromEndpoints,
} from './toolbar-hover.js';

const sel = [
  { left: 100, top: 200, right: 400, bottom: 216 },
  { left: 100, top: 218, right: 380, bottom: 234 },
];
const toolbar = { left: 150, top: 160, right: 350, bottom: 184 }; // 选区上方 16px（offset 8 + 高度）

describe('toolbar-hover（#106 可达性几何）', () => {
  it('rectsFromClientRects：丢弃零宽行（换行空 rect）', () => {
    const out = rectsFromClientRects([
      { left: 10, top: 10, right: 60, bottom: 30 },
      { left: 10, top: 30, right: 10, bottom: 30 }, // 零宽
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ left: 10, top: 10, right: 60, bottom: 30 });
  });

  it('rectsFromEndpoints：两点包围盒（退化路径）', () => {
    const out = rectsFromEndpoints({ x: 10, y: 50 }, { x: 200, y: 20 });
    expect(out).toEqual([{ left: 10, top: 20, right: 200, bottom: 50 }]);
  });

  it('pointInRects：命中第一行/第二行/边界外 + pad', () => {
    expect(pointInRects({ x: 200, y: 208 }, sel)).toBe(true);
    expect(pointInRects({ x: 200, y: 226 }, sel)).toBe(true);
    expect(pointInRects({ x: 200, y: 170 }, sel)).toBe(false); // 两行之间的空隙之外（工具条位置）
    expect(pointInRects({ x: 200, y: 170 }, sel, 50)).toBe(true); // pad 放大后覆盖
  });

  it('corridorBetween：工具条在上方 → 走廊连接工具条底边与选区顶边', () => {
    const c = corridorBetween(sel, toolbar);
    expect(c).toEqual({ left: 100, top: 184, right: 400, bottom: 200 });
  });

  it('corridorBetween：工具条在下方（flip）→ 反向走廊', () => {
    const below = { left: 150, top: 260, right: 350, bottom: 284 };
    const c = corridorBetween(sel, below);
    expect(c).toEqual({ left: 100, top: 234, right: 400, bottom: 260 });
  });

  it('corridorBetween：无工具条返回 null；重叠时返回 null', () => {
    expect(corridorBetween(sel, null)).toBeNull();
    expect(corridorBetween(sel, { left: 100, top: 210, right: 300, bottom: 220 })).toBeNull();
  });

  it('reachableRects：选区 ∪ 工具条 ∪ 走廊 —— 死区被覆盖', () => {
    const rects = reachableRects(sel, toolbar);
    expect(rects).toHaveLength(4);
    // 旧实现死区：选区顶边(200) 与工具条底边(184) 之间的点
    expect(pointInRects({ x: 300, y: 192 }, sel)).toBe(false); // 旧判定框判否
    expect(pointInRects({ x: 300, y: 192 }, rects, 8)).toBe(true); // 新可达区判是
    // 工具条自身可命中
    expect(pointInRects({ x: 300, y: 170 }, rects)).toBe(true);
  });

  it('多行选区：两行之间与行尾外扩都可命中（不再只认端点包围盒）', () => {
    // 行间空隙（第一行底 216 ~ 第二行顶 218）
    expect(pointInRects({ x: 200, y: 217 }, reachableRects(sel, toolbar), 8)).toBe(true);
    // 第二行右端之外 60px（旧包围盒 right=400 判否；实际选区第二行只到 380，但 pad 8 内应为是）
    expect(pointInRects({ x: 386, y: 226 }, reachableRects(sel, toolbar), 8)).toBe(true);
    expect(pointInRects({ x: 500, y: 226 }, reachableRects(sel, toolbar), 8)).toBe(false);
  });
});
