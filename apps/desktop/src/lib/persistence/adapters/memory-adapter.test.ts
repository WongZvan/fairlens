import { describe, expect, it } from 'vitest';
import { ResumeDoc } from '@fairlens/shared';
import { createMemoryAdapter } from './memory-adapter.js';

const doc = ResumeDoc.parse({
  templateId: 'tpl-duo',
  profile: { name: '李思远' },
  sections: [{ id: 'SectMemory01', type: 'basic', title: '基本信息', entries: [] }],
});

const row = (id: string, over: Partial<Record<string, unknown>> = {}) => ({
  id,
  title: '测试简历',
  verticalId: 'general',
  doc,
  status: 'active' as const,
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
  ...over,
});

describe('memory adapter（#129：meta 与删除级联）', () => {
  it('listResumeMetas 返回全部状态 + templateId + snapshotCount', async () => {
    const a = createMemoryAdapter();
    await a.upsertResume(row('ResumeMemo01'));
    await a.upsertResume(row('ResumeMemo02', { status: 'archived' }));
    await a.insertSnapshot({
      id: 'SnapMemo0001',
      resumeId: 'ResumeMemo01',
      doc,
      trigger: 'manual',
      createdAt: '2026-11-23T01:00:00.000Z',
    });
    const metas = await a.listResumeMetas();
    expect(metas).toHaveLength(2); // 归档的也在，筛选交 UI
    const active = metas.find((m) => m.id === 'ResumeMemo01')!;
    expect(active.templateId).toBe('tpl-duo');
    expect(active.snapshotCount).toBe(1);
    expect(metas.find((m) => m.id === 'ResumeMemo02')!.status).toBe('archived');
  });

  it('deleteResume 同时清掉快照（与 SQLite CASCADE 对齐）', async () => {
    const a = createMemoryAdapter();
    await a.upsertResume(row('ResumeMemo03'));
    await a.insertSnapshot({
      id: 'SnapMemo0002',
      resumeId: 'ResumeMemo03',
      doc,
      trigger: 'manual',
      createdAt: '2026-11-23T01:00:00.000Z',
    });
    await a.deleteResume('ResumeMemo03');
    expect(await a.getResume('ResumeMemo03')).toBeNull();
    expect(await a.listSnapshots('ResumeMemo03')).toEqual([]);
    expect(await a.listResumeMetas()).toEqual([]);
  });

  it('settings 支持 sampleSeeded 标记', async () => {
    const a = createMemoryAdapter();
    expect(await a.getSettingRaw('sampleSeeded')).toBeUndefined();
    await a.setSettingRaw('sampleSeeded', true);
    expect(await a.getSettingRaw('sampleSeeded')).toBe(true);
  });
});
