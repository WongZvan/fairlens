import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeMeta } from '@fairlens/core';
import type { ResumeRow } from '@fairlens/shared';

/**
 * #129 简历库 store 回归（codex 复核）：
 *  - init 与新建串行：模板卡不会抢在示例播种前落库；
 *  - 写失败返回 false + error，供 UI 保留弹窗；
 *  - 示例身份用 settings.sampleResumeId，重命名不丢、删除即清。
 */

const fake = vi.hoisted(() => {
  const rows = new Map<string, ResumeRow>();
  const settings = new Map<string, unknown>();
  const writes: Array<{ id: string; title: string }> = [];
  let seedGate: Promise<void> | null = null;
  let failUpsert = false;
  let failDelete = false;
  return {
    rows,
    settings,
    writes,
    get seedGate() { return seedGate; },
    set seedGate(v: Promise<void> | null) { seedGate = v; },
    get failUpsert() { return failUpsert; },
    set failUpsert(v: boolean) { failUpsert = v; },
    get failDelete() { return failDelete; },
    set failDelete(v: boolean) { failDelete = v; },
  };
});

vi.mock('../lib/persistence/index.js', () => ({
  persistence: () => ({
    async listResumeMetas(): Promise<ResumeMeta[]> {
      return [...fake.rows.values()]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((r) => ({
          id: r.id, title: r.title, verticalId: r.verticalId, status: r.status,
          updatedAt: r.updatedAt, templateId: r.doc.templateId, snapshotCount: 0,
        }));
    },
    async getResume(id: string) { return fake.rows.get(id) ?? null; },
    async upsertResume(row: ResumeRow) {
      if (fake.failUpsert) throw new Error('upsert failed');
      fake.rows.set(row.id, structuredClone(row));
      fake.writes.push({ id: row.id, title: row.title });
    },
    async deleteResume(id: string) {
      if (fake.failDelete) throw new Error('delete failed');
      fake.rows.delete(id);
    },
    async getSettingRaw(key: string) {
      if (key === 'sampleSeeded' && fake.seedGate) await fake.seedGate;
      return fake.settings.get(key);
    },
    async setSettingRaw(key: string, value: unknown) { fake.settings.set(key, value); },
    async deleteSetting(key: string) { fake.settings.delete(key); },
    async listSnapshots() { return []; },
    async insertSnapshot() {},
  }),
}));

type LibraryModule = typeof import('./library.js');
let useLibrary: LibraryModule['useLibrary'];

const blankArgs = { templateId: 'tpl-classic', titleBase: '我的简历', basicSection: '基本信息' };

describe('library store（#129）', () => {
  beforeEach(async () => {
    fake.rows.clear();
    fake.settings.clear();
    fake.writes.length = 0;
    fake.seedGate = null;
    fake.failUpsert = false;
    fake.failDelete = false;
    vi.resetModules();
    ({ useLibrary } = await import('./library.js'));
  });

  it('init 未完成时新建：示例先落库，新简历后落库（不丢示例）', async () => {
    let releaseSeed: () => void = () => {};
    fake.seedGate = new Promise<void>((resolve) => { releaseSeed = resolve; });

    const initPromise = useLibrary.getState().init().catch(() => {});
    const created = useLibrary.getState().createFromTemplate(blankArgs);
    releaseSeed();

    await initPromise;
    const id = await created;
    expect(id).toBeTruthy();
    expect(fake.writes.map((w) => w.title)).toEqual(['示例简历', '我的简历']);
    expect(fake.rows.size).toBe(2);
    expect([...fake.rows.values()].some((r) => r.title === '示例简历')).toBe(true);
  });

  it('重命名/归档/删除失败返回 false 并记录 error（UI 据此保留弹窗）', async () => {
    fake.rows.set('ResumeLib001', {
      id: 'ResumeLib001', title: '目标', verticalId: 'general',
      doc: { templateId: 'tpl-classic', sections: [{ id: 'SectLib00001', type: 'basic', title: '基本信息', entries: [] }] },
      status: 'active', createdAt: '2026-11-23T00:00:00.000Z', updatedAt: '2026-11-23T00:00:00.000Z',
    });
    fake.settings.set('sampleSeeded', true);
    await useLibrary.getState().init();

    fake.failUpsert = true;
    expect(await useLibrary.getState().rename('ResumeLib001', '新名字')).toBe(false);
    expect(useLibrary.getState().error).toBeTruthy();
    expect(await useLibrary.getState().setArchived('ResumeLib001', true)).toBe(false);
    expect(useLibrary.getState().error).toBeTruthy();

    fake.failDelete = true;
    expect(await useLibrary.getState().remove('ResumeLib001')).toBe(false);
    expect(useLibrary.getState().error).toBeTruthy();
  });

  it('示例身份用 sampleResumeId：重命名保留、删除清除', async () => {
    await useLibrary.getState().init();
    const sampleId = useLibrary.getState().sampleResumeId;
    expect(sampleId).toBeTruthy();
    expect(fake.settings.get('sampleResumeId')).toBe(sampleId);

    expect(await useLibrary.getState().rename(sampleId!, '改过的示例')).toBe(true);
    expect(useLibrary.getState().sampleResumeId).toBe(sampleId);
    expect(useLibrary.getState().metas.find((m) => m.id === sampleId)?.title).toBe('改过的示例');

    expect(await useLibrary.getState().remove(sampleId!)).toBe(true);
    expect(useLibrary.getState().sampleResumeId).toBeNull();
    expect(fake.settings.has('sampleResumeId')).toBe(false);
  });
});
