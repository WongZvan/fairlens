import { describe, expect, it } from 'vitest';
import { placeDropdown, type AnchorRect } from './dropdown.js';

/** 视口 960×640，锚点默认模拟命令栏里 28px 高的按钮 */
const viewport = { width: 960, height: 640 };
const anchorAt = (left: number, top = 20, width = 40): AnchorRect => ({
  left,
  right: left + width,
  top,
  bottom: top + 28,
});

describe('命令栏下拉定位（#124 回归）', () => {
  it('左对齐：左缘贴锚点左缘，落在栏下方 4px', () => {
    const p = placeDropdown(anchorAt(100), { width: 208, height: 300 }, viewport, { align: 'left' });
    expect(p.left).toBe(100);
    expect(p.top).toBe(20 + 28 + 4);
    expect(p.flipped).toBe(false);
  });

  it('右对齐：右缘贴锚点右缘（导出按钮贴右侧）', () => {
    const p = placeDropdown(anchorAt(800), { width: 208, height: 160 }, viewport, { align: 'right' });
    expect(p.left).toBe(840 - 208);
  });

  it('右侧越界时夹取到视口留白内', () => {
    const p = placeDropdown(anchorAt(900), { width: 208, height: 160 }, viewport, { align: 'left' });
    expect(p.left).toBe(960 - 208 - 8);
  });

  it('左侧越界时不留负坐标', () => {
    const p = placeDropdown(anchorAt(2), { width: 208, height: 160 }, viewport, { align: 'left' });
    expect(p.left).toBe(8);
  });

  it('下拉比视口还宽：左缘钉在留白处，不产生负值', () => {
    const p = placeDropdown(anchorAt(10), { width: 208, height: 100 }, { width: 200, height: 640 }, { align: 'left' });
    expect(p.left).toBe(8);
  });

  it('下方不够且上方更宽裕时翻转向上', () => {
    const p = placeDropdown({ left: 100, right: 140, top: 590, bottom: 618 }, { width: 208, height: 300 }, viewport, {
      align: 'left',
    });
    expect(p.flipped).toBe(true);
    expect(p.top).toBe(590 - 4 - 300);
    expect(p.maxHeight).toBe(520);
  });

  it('两侧都窄但上方更差时留在下方（翻转只会更糟）', () => {
    const p = placeDropdown(
      { left: 100, right: 140, top: 60, bottom: 88 },
      { width: 208, height: 300 },
      { width: 960, height: 200 },
      { align: 'left' },
    );
    expect(p.flipped).toBe(false);
    expect(p.top).toBe(88 + 4);
    expect(p.maxHeight).toBe(200 - 88 - 4 - 8);
  });

  it('高度上限 520：空间充足也不无限拉长', () => {
    const p = placeDropdown(anchorAt(100), { width: 208, height: 600 }, { width: 960, height: 1200 }, { align: 'left' });
    expect(p.maxHeight).toBe(520);
  });
});
