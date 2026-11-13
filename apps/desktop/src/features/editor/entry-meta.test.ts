import { describe, expect, it } from 'vitest';
import { formatDateRange, parseDateRange } from './entry-meta.js';

describe('条目头日期区间（#117；2026-11-13 #122 放开自由文本）', () => {
  it('解析完整区间', () => {
    expect(parseDateRange('2022.09 – 2026.06')).toEqual({ start: '2022.09', end: '2026.06', ongoing: false });
  });

  it('解析至今（含英文 present/now）', () => {
    expect(parseDateRange('2025.06 – 至今')).toEqual({ start: '2025.06', ongoing: true });
    expect(parseDateRange('2025.06 - present')).toEqual({ start: '2025.06', ongoing: true });
    expect(parseDateRange('2025.06 – now')).toEqual({ start: '2025.06', ongoing: true });
  });

  it('只填起始月', () => {
    expect(parseDateRange('2025.06')).toEqual({ start: '2025.06', ongoing: false });
  });

  it('空输入合法（条目可以没有日期）', () => {
    expect(parseDateRange('')).toEqual({ ongoing: false });
    expect(parseDateRange('   ')).toEqual({ ongoing: false });
  });

  it('#122 自由文本一律接受（不再返回 null）', () => {
    for (const input of ['abc', '大三', '2022', '2022年9月', '2022.09.15', '2022/09', '2022.9', '2022.13 – 2023.01']) {
      expect(parseDateRange(input)).not.toBeNull();
    }
  });

  it('#122 自由文本原样保留（不做格式归一/纠正）', () => {
    expect(parseDateRange('大三 – 大四')).toEqual({ start: '大三', end: '大四', ongoing: false });
    expect(parseDateRange('2022年9月 – 2023年1月')).toEqual({ start: '2022年9月', end: '2023年1月', ongoing: false });
    expect(parseDateRange('2022.09')).toEqual({ start: '2022.09', ongoing: false });
  });

  it('#122 倒序不再在解析层拒绝（交给契约层按可比较性判定）', () => {
    expect(parseDateRange('2026.06 – 2022.09')).toEqual({ start: '2026.06', end: '2022.09', ongoing: false });
  });

  it('#122 半截区间（缺一侧）只留存在的一侧', () => {
    expect(parseDateRange('2022.09 –')).toEqual({ start: '2022.09', ongoing: false });
    expect(parseDateRange('– 2022.09')).toEqual({ end: '2022.09', ongoing: false });
  });

  it('分隔符归一：- / – / — / ~ / ～ 与两侧空格', () => {
    expect(parseDateRange('2022.09-2026.06')).toEqual({ start: '2022.09', end: '2026.06', ongoing: false });
    expect(parseDateRange('2022.09～2026.06')).toEqual({ start: '2022.09', end: '2026.06', ongoing: false });
    expect(parseDateRange('2022.09 — 2026.06')).toEqual({ start: '2022.09', end: '2026.06', ongoing: false });
  });

  it('格式化覆盖区间/至今/仅起始/空', () => {
    expect(formatDateRange('2022.09', '2026.06', false)).toBe('2022.09 – 2026.06');
    expect(formatDateRange('2025.06', null, true)).toBe('2025.06 – 至今');
    expect(formatDateRange('2025.06')).toBe('2025.06');
    expect(formatDateRange()).toBe('');
    // 自由文本原样输出
    expect(formatDateRange('大三', '大四', false)).toBe('大三 – 大四');
  });
});