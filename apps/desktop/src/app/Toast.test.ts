import { describe, expect, it } from 'vitest';
import { toastDurationMs } from './Toast.js';

describe('toast 时长（#127 打磨）', () => {
  it('短提示 2.2s 起', () => {
    expect(toastDurationMs('')).toBe(2200);
    expect(toastDurationMs('已保存')).toBe(2320);
  });

  it('长提示按字数延长，封顶 6s', () => {
    expect(toastDurationMs('x'.repeat(50))).toBe(2200 + 2000);
    expect(toastDurationMs('x'.repeat(500))).toBe(6000);
  });

  it('单调不减', () => {
    expect(toastDurationMs('保存失败，请重试')).toBeGreaterThanOrEqual(toastDurationMs('已保存'));
  });
});
