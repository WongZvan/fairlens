import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeMeta } from '@fairlens/core';
import type { ResumeRow } from '@fairlens/shared';
import { sampleDoc } from '../features/editor-mockup/sample-data.js';

/**
 * #129 简历库 store 回归（codex 两轮复核）：
 *  - init 与新建串行；连续新建标题去重；
 *  - 写入失败 vs 写入成功但刷新失败必须可区分；
 *  - 列表刷新乱序不得覆盖新结果；刷新/setting 读取失败不静默；
 *  - 示例身份 sampleResumeId：旧库一次性回填、清空同步、删除清除。
 */

const fake = vi.hoisted(() => {
  const rows = new Map<string, ResumeRow>();
  const settings = new Map<string, unknown>();
  const writes: Array<{ id: string; title: string }> = [];
  let seedGate: Promise<void> | null = null;
  let upsertGate: Promise<void> | null = null;
  let failUpsert = false;
  let failDelete = false;
  let failList = false;
  let failSettingRead = false;
  let failDeleteSetting = false;
  let listImpl: (() => Promise<ResumeMeta[]>) | null = null;
  return {
    rows,
    settings,
    writes,
    get seedGate() { return seedGate; },
    set seedGate(v: Promise<void> | null) { seedGate = v; },
    get upsertGate() { return upsertGate; },
    set upsertGate(v: Promise<void> | null) { upsertGate = v; },
    get failUpsert() { return failUpsert; },
    set failUpsert(v: boolean) { failUpsert = v; },
    get failDelete() { return failDelete; },
    set failDelete(v: boolean) { failDelete = v; },
    get failList() { return failList; },
    set failList(v: boolean) { failList = v; },
    get failSettingRead() { return failSettingRead; },
    set failSettingRead(v: boolean) { failSettingRead = v; },
    get failDeleteSetting() { return failDeleteSetting; },
    set failDeleteSetting(v: boolean) { failDeleteSetting = v; },
    get listImpl() { return listImpl; },
    set listImpl(v: (() => Promise<ResumeMeta[]>) | null) { listImpl = v; },
  };
});

vi.mock('../lib/persistence/index.js', () => ({
  persistence: () => ({
    async listResumeMetas(): Promise<ResumeMeta[]> {
      if (fake.failList) throw new Error('list failed');
      if (fake.listImpl) return fake.listImpl();
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
      if (fake.upsertGate && fake.writes.length === 0) await fake.upsertGate;
      fake.rows.set(row.id, structuredClone(row));
      fake.writes.push({ id: row.id, title: row.title });
    },
    async deleteResume(id: string) {
      if (fake.failDelete) throw new Error('delete failed');
      fake.rows.delete(id);
    },
    async getSettingRaw(key: string) {
      if (key === 'sampleSeeded' && fake.seedGate) await fake.seedGate;
      if (key === 'sampleResumeId' && fake.failSettingRead) throw new Error('setting read failed');
      return fake.settings.get(key);
    },
    async setSettingRaw(key: string, value: unknown) { fake.settings.set(key, value); },
    async deleteSetting(key: string) {
      if (fake.failDeleteSetting) throw new Error('setting delete failed');
      fake.settings.delete(key);
    },
    async listSnapshots() { return []; },
    async insertSnapshot() {},
  }),
}));

type LibraryModule = typeof import('./library.js');
let useLibrary: LibraryModule['useLibrary'];

const blankArgs = { templateId: 'tpl-classic', titleBase: '我的简历', basicSection: '基本信息' };

const rowOf = (id: string, title: string, doc = sampleDoc): ResumeRow => ({
  id,
  title,
  verticalId: 'general',
  doc,
  status: 'active',
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
});

const metaOf = (id: string, title: string, status: 'active' | 'archived' = 'active'): ResumeMeta => ({
  id, title, verticalId: 'general', status,
  updatedAt: '2026-11-23T00:00:00.000Z', templateId: 'tpl-classic', snapshotCount: 0,
});

describe('library store（#129）', () => {
  beforeEach(async () => {
    fake.rows.clear();
    fake.settings.clear();
    fake.writes.length = 0;
    fake.seedGate = null;
    fake.upsertGate = null;
    fake.failUpsert = false;
    fake.failDelete = false;
    fake.failList = false;
    fake.failSettingRead = false;
    fake.failDeleteSetting = false;
    fake.listImpl = null;
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
    const result = await created;
    expect(result.id).toBeTruthy();
    expect(result.outcome).toBe('ok');
    expect(fake.writes.map((w) => w.title)).toEqual(['示例简历', '我的简历']);
    expect(fake.rows.size).toBe(2);
  });

  it('写入失败与“写入成功但刷新失败”区分：create/rename/archive/remove', async () => {
    fake.settings.set('sampleSeeded', true);
    fake.rows.set('ResumeLib001', rowOf('ResumeLib001', '目标', sampleDoc));

    // ① 写入失败
    fake.failUpsert = true;
    expect(await useLibrary.getState().init()).toBeUndefined();
    const createFail = await useLibrary.getState().createFromTemplate(blankArgs);
    expect(createFail).toEqual({ id: null, outcome: 'write-failed' });
    expect(await useLibrary.getState().rename('ResumeLib001', '新名字')).toBe('write-failed');
    expect(await useLibrary.getState().setArchived('ResumeLib001', true)).toBe('write-failed');

    // ② 写入成功但刷新失败（列表预读成功、写入后刷新抛错）
    fake.failUpsert = false;
    let listCalls = 0;
    fake.listImpl = async () => {
      listCalls += 1;
      if (listCalls >= 2) throw new Error('list failed');
      return [...fake.rows.values()].map((r) => ({
        id: r.id, title: r.title, verticalId: r.verticalId, status: r.status,
        updatedAt: r.updatedAt, templateId: r.doc.templateId, snapshotCount: 0,
      }));
    };
    const created = await useLibrary.getState().createFromTemplate(blankArgs);
    expect(created.id).toBeTruthy();
    expect(created.outcome).toBe('refresh-failed');
    expect(fake.rows.has(created.id!)).toBe(true); // 行确实存在，不能提示“新建失败”
    expect(await useLibrary.getState().rename('ResumeLib001', '新名字')).toBe('refresh-failed');
    expect(fake.rows.get('ResumeLib001')?.title).toBe('新名字');
    expect(await useLibrary.getState().setArchived('ResumeLib001', true)).toBe('refresh-failed');
    expect(await useLibrary.getState().remove('ResumeLib001')).toBe('refresh-failed');
    expect(fake.rows.has('ResumeLib001')).toBe(false);

    // ③ 删除写入失败
    fake.listImpl = null;
    fake.failList = false;
    fake.failDelete = true;
    expect(await useLibrary.getState().remove(created.id!)).toBe('write-failed');
  });

  it('列刷新乱序：旧请求晚到不覆盖新结果', async () => {
    let releaseOld: () => void = () => {};
    const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
    let call = 0;
    fake.listImpl = async () => {
      call += 1;
      if (call === 1) {
        await oldGate;
        return [metaOf('ResumeOld001', '旧列表')];
      }
      return [metaOf('ResumeNew001', '新列表', 'archived')];
    };

    const oldRefresh = useLibrary.getState().refresh();
    const newRefresh = useLibrary.getState().refresh();
    releaseOld();
    await oldRefresh;
    await newRefresh;
    expect(useLibrary.getState().metas.map((m) => m.title)).toEqual(['新列表']);
    expect(useLibrary.getState().metas[0]!.status).toBe('archived');
  });

  it('示例身份读取失败：不当作“没有示例”，不清徽标', async () => {
    await useLibrary.getState().init();
    const before = useLibrary.getState().sampleResumeId;
    expect(before).toBeTruthy();
    fake.failSettingRead = true;
    await expect(useLibrary.getState().refresh()).rejects.toThrow('setting read failed');
    expect(useLibrary.getState().sampleResumeId).toBe(before);
    expect(useLibrary.getState().syncError).toBeTruthy();
  });

  it('示例身份：重命名保留、删除清除', async () => {
    await useLibrary.getState().init();
    const sampleId = useLibrary.getState().sampleResumeId;
    expect(sampleId).toBeTruthy();
    expect(fake.settings.get('sampleResumeId')).toBe(sampleId);

    expect(await useLibrary.getState().rename(sampleId!, '改过的示例')).toBe('ok');
    expect(useLibrary.getState().sampleResumeId).toBe(sampleId);
    expect(useLibrary.getState().metas.find((m) => m.id === sampleId)?.title).toBe('改过的示例');

    expect(await useLibrary.getState().remove(sampleId!)).toBe('ok');
    expect(useLibrary.getState().sampleResumeId).toBeNull();
    expect(fake.settings.has('sampleResumeId')).toBe(false);
  });

  it('旧库回填只做一次：清空/恢复后重启不得复活身份', async () => {
    fake.settings.set('sampleSeeded', true);
    fake.rows.set('SampleLegacy1', rowOf('SampleLegacy1', '示例简历'));

    await useLibrary.getState().init();
    expect(useLibrary.getState().sampleResumeId).toBe('SampleLegacy1');
    expect(fake.settings.get('sampleIdentityMigrated')).toBe(true);

    // 模拟“清空示例”：身份键被删；内容/标题仍在旧库（极端：从快照恢复且改回同名）
    fake.settings.delete('sampleResumeId');
    vi.resetModules();
    ({ useLibrary } = await import('./library.js'));
    await useLibrary.getState().init();
    expect(useLibrary.getState().sampleResumeId).toBeNull();
    expect(fake.settings.has('sampleResumeId')).toBe(false);
  });

  it('旧库回填不误认：同名但文档不同 / 同名多条 → 不设置身份', async () => {
    fake.settings.set('sampleSeeded', true);
    fake.rows.set('UserNamedSame1', rowOf('UserNamedSame1', '示例简历', {
      templateId: 'tpl-classic',
      sections: [{ id: 'SectUser00001', type: 'basic', title: '基本信息', entries: [] }],
    }));
    await useLibrary.getState().init();
    expect(useLibrary.getState().sampleResumeId).toBeNull();
    expect(fake.settings.has('sampleResumeId')).toBe(false);

    fake.rows.set('SampleLegacy2', rowOf('SampleLegacy2', '示例简历'));
    vi.resetModules();
    ({ useLibrary } = await import('./library.js'));
    await useLibrary.getState().init();
    expect(useLibrary.getState().sampleResumeId).toBeNull();
  });

  it('清空示例后返回库页：refresh 同步 sampleResumeId（徽标消失）', async () => {
    await useLibrary.getState().init();
    expect(useLibrary.getState().sampleResumeId).toBeTruthy();
    fake.settings.delete('sampleResumeId');
    await useLibrary.getState().refresh();
    expect(useLibrary.getState().sampleResumeId).toBeNull();
  });

  it('列表查询失败：init 失败且可重试；写后刷新失败不报成功', async () => {
    fake.failList = true;
    await expect(useLibrary.getState().init()).rejects.toThrow('list failed');
    expect(useLibrary.getState().initialized).toBe(false);
    expect(useLibrary.getState().syncError).toBeTruthy();

    fake.failList = false;
    await useLibrary.getState().init();
    expect(useLibrary.getState().initialized).toBe(true);

    const sampleId = useLibrary.getState().sampleResumeId!;
    fake.failList = true;
    expect(await useLibrary.getState().rename(sampleId, '改名')).toBe('refresh-failed');
    expect(useLibrary.getState().syncError).toBeTruthy();
    expect(await useLibrary.getState().setArchived(sampleId, true)).toBe('refresh-failed');
    expect(await useLibrary.getState().remove(sampleId)).toBe('refresh-failed');
  });

  it('连续新建：串行分配标题，不产生重名', async () => {
    fake.settings.set('sampleSeeded', true);
    await useLibrary.getState().init();

    let release: () => void = () => {};
    fake.upsertGate = new Promise<void>((resolve) => { release = resolve; });
    const p1 = useLibrary.getState().createFromTemplate(blankArgs);
    const p2 = useLibrary.getState().createFromTemplate(blankArgs);
    release();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.id).toBeTruthy();
    expect(r2.id).toBeTruthy();
    const titles = [...fake.rows.values()].map((r) => r.title).sort();
    expect(titles).toEqual(['我的简历', '我的简历 2']);
  });
});
