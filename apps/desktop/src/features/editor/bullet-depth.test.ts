import { describe, expect, it } from 'vitest';
import { BULLET_DEPTH_MAX, nextBulletDepth, normalizeBulletDepth } from './bullet-depth.js';

describe('要点层级缩进（#123）', () => {
  it('归一：null/undefined/越界/非数字 → 0', () => {
    for (const v of [null, undefined, 0, 3, -1, '1', {}, NaN]) {
      expect(normalizeBulletDepth(v)).toBe(0);
    }
  });

  it('归一：1/2 原样', () => {
    expect(normalizeBulletDepth(1)).toBe(1);
    expect(normalizeBulletDepth(2)).toBe(2);
  });

  it('Tab 逐级加深，上限 2', () => {
    expect(nextBulletDepth(0, 1)).toBe(1);
    expect(nextBulletDepth(1, 1)).toBe(2);
    expect(nextBulletDepth(2, 1)).toBe(2); // 已到底：不变（但仍 preventDefault）
  });

  it('Shift+Tab 逐级减淡，下限 0', () => {
    expect(nextBulletDepth(2, -1)).toBe(1);
    expect(nextBulletDepth(1, -1)).toBe(0);
    expect(nextBulletDepth(0, -1)).toBe(0); // 已到顶：不变
  });

  it('缺省属性（旧文档）按 0 处理', () => {
    expect(nextBulletDepth(null, 1)).toBe(1);
    expect(nextBulletDepth(undefined, -1)).toBe(0);
  });

  it('上限常量与契约一致（BulletDepth 0|1|2）', () => {
    expect(BULLET_DEPTH_MAX).toBe(2);
  });
});