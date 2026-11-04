import { describe, expect, it } from 'vitest';
import { placeBubble } from './paste-bubble.js';

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 60 };

describe('粘贴气泡定位（视口 clamp / 上下翻转）', () => {
  it('常规位置：落在光标下方 8px', () => {
    expect(placeBubble({ left: 100, top: 100, bottom: 120 }, size, viewport)).toEqual({
      left: 100,
      top: 128,
      placement: 'below',
    });
  });

  it('右边界回收：不超出视口 8px 边距', () => {
    expect(placeBubble({ left: 950, top: 100, bottom: 120 }, size, viewport).left).toBe(792);
  });

  it('底部空间不足：翻转到光标上方', () => {
    const pos = placeBubble({ left: 100, top: 750, bottom: 770 }, size, viewport);
    expect(pos.placement).toBe('above');
    expect(pos.top).toBe(682);
  });

  it('上方仍不足：贴顶 8px，不出现负坐标', () => {
    const pos = placeBubble({ left: 100, top: 20, bottom: 760 }, size, viewport);
    expect(pos.top).toBe(8);
  });
});
