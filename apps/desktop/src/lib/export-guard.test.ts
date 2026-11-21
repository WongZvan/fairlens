import { describe, expect, it } from 'vitest';
import { isNameMissing } from './export-guard.js';

describe('isNameMissing（#128 导出前姓名拦截）', () => {
  it('未填写（undefined / null / 空串）视为缺失', () => {
    expect(isNameMissing(undefined)).toBe(true);
    expect(isNameMissing(null)).toBe(true);
    expect(isNameMissing('')).toBe(true);
    expect(isNameMissing('   ')).toBe(true);
  });

  it('有姓名（含首尾空格）允许导出', () => {
    expect(isNameMissing('李思远')).toBe(false);
    expect(isNameMissing('  李思远  ')).toBe(false);
  });
});
