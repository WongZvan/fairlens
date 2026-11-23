import { describe, expect, it } from 'vitest';
import type { ResumeMeta } from '@fairlens/core';
import {
  archivedCount,
  formatUpdatedAt,
  nextResumeTitle,
  resolveSeedAction,
  visibleResumes,
} from './library-view-model.js';

const meta = (over: Partial<ResumeMeta> = {}): ResumeMeta => ({
  id: 'Resume000001',
  title: '我的简历',
  verticalId: 'general',
  status: 'active',
  updatedAt: '2026-11-23T08:00:00.000Z',
  templateId: 'tpl-classic',
  snapshotCount: 0,
  ...over,
});

describe('resolveSeedAction（#129 首启三态）', () => {
  it('标记为真 → 什么都不做', () => {
    expect(resolveSeedAction(true, 0)).toBe('none');
    expect(resolveSeedAction(true, 3)).toBe('none');
  });
  it('标记缺失且已有简历 → 只补标记（旧库升级不重复示例）', () => {
    expect(resolveSeedAction(false, 1)).toBe('mark-only');
  });
  it('标记缺失且空库 → 播种示例', () => {
    expect(resolveSeedAction(false, 0)).toBe('seed');
  });
});

describe('归档筛选', () => {
  const list = [meta(), meta({ id: 'Resume000002', status: 'archived' })];
  it('默认只显示 active', () => {
    expect(visibleResumes(list, false)).toHaveLength(1);
    expect(visibleResumes(list, false)[0]!.status).toBe('active');
  });
  it('显示归档时返回全部', () => {
    expect(visibleResumes(list, true)).toHaveLength(2);
  });
  it('统计归档数', () => {
    expect(archivedCount(list)).toBe(1);
  });
});

describe('nextResumeTitle', () => {
  it('无冲突用基名', () => {
    expect(nextResumeTitle('我的简历', [])).toBe('我的简历');
  });
  it('冲突时递增后缀', () => {
    expect(nextResumeTitle('我的简历', ['我的简历', '我的简历 2'])).toBe('我的简历 3');
  });
});

describe('formatUpdatedAt（结构化，文案由 i18n 组装）', () => {
  const now = new Date(2026, 10, 23, 15, 0);
  it('今天 / 昨天带时间', () => {
    expect(formatUpdatedAt(new Date(2026, 10, 23, 9, 5).toISOString(), now)).toEqual({ kind: 'today', time: '09:05' });
    expect(formatUpdatedAt(new Date(2026, 10, 22, 21, 12).toISOString(), now)).toEqual({ kind: 'yesterday', time: '21:12' });
  });
  it('同年更早显示 MM-DD；跨年显示 YYYY-MM-DD', () => {
    expect(formatUpdatedAt(new Date(2026, 9, 20, 9, 12).toISOString(), now)).toEqual({ kind: 'date', date: '10-20' });
    expect(formatUpdatedAt(new Date(2025, 11, 31, 9, 12).toISOString(), now)).toEqual({ kind: 'date', date: '2025-12-31' });
  });
  it('非法时间原样回落', () => {
    expect(formatUpdatedAt('not-a-date', now)).toEqual({ kind: 'date', date: 'not-a-date' });
  });
});
