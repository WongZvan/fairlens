import { describe, expect, it } from 'vitest';
import { formatDateRange, parseDateRange } from './entry-meta.js';

describe('条目头日期区间（#117）', () => {
  it('解析完整区间', () => {
    expect(parseDateRange('2022.09 – 2026.06')).toEqual({ start: '2022.09', end: '2026.06', ongoing: false });
  });

  it('解析至今（含英文 present/now）', () => {
    expect(parseDateRange('2025.06 – 至今')).toEqual({ start: '2025.06', ongoing: true });
    expect(parseDateRange('2025.06 - present')).toEqual({ start: '2025.06', ongoing: true });
  });

  it('只填起始月', () => {
    expect(parseDateRange('2025.06')).toEqual({ start: '2025.06', ongoing: false });
  });

  it('空输入合法（条目可以没有日期）', () => {
    expect(parseDateRange('')).toEqual({ ongoing: false });
    expect(parseDateRange('   ')).toEqual({ ongoing: false });
  });

  it('非法格式/非法月份/结束早于开始 → null', () => {
    expect(parseDateRange('abc')).toBeNull();
    expect(parseDateRange('2022.13 – 2023.01')).toBeNull();
    expect(parseDateRange('2026.06 – 2022.09')).toBeNull();
    expect(parseDateRange('2022.09 –')).toBeNull();
  });

  it('格式化覆盖区间/至今/仅起始/空', () => {
    expect(formatDateRange('2022.09', '2026.06', false)).toBe('2022.09 – 2026.06');
    expect(formatDateRange('2025.06', null, true)).toBe('2025.06 – 至今');
    expect(formatDateRange('2025.06')).toBe('2025.06');
    expect(formatDateRange()).toBe('');
  });
});
