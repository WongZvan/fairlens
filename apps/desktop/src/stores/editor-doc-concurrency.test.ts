import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeDoc, ResumeRow } from '@fairlens/shared';

/**
 * #129 并发回归（codex 复核）：
 *  - A/B 乱序完成：后发起的打开胜出；
 *  - 旧文档在 B 的 settings 读取窗口内触发自动保存：只能写 A 的行，绝不写 B。
 */

const fake = vi.hoisted(() => {
  const rows = new Map<string, ResumeRow>();
  const writes: Array<{ id: string; doc: ResumeDoc }> = [];
  const getDelay = new Map<string, Promise<void>>();
  let settingDelay: Promise<void> | null = null;
  let failDeleteSetting = false;
  let failSampleSettingRead = false;
  let upsertGate: Promise<void> | null = null;
  let failUpsert = false;
  const settings = new Map<string, unknown>();
  return {
    rows,
    writes,
    getDelay,
    settings,
    get settingDelay() { return settingDelay; },
    set settingDelay(v: Promise<void> | null) { settingDelay = v; },
    get failDeleteSetting() { return failDeleteSetting; },
    set failDeleteSetting(v: boolean) { failDeleteSetting = v; },
    get failSampleSettingRead() { return failSampleSettingRead; },
    set failSampleSettingRead(v: boolean) { failSampleSettingRead = v; },
    get upsertGate() { return upsertGate; },
    set upsertGate(v: Promise<void> | null) { upsertGate = v; },
    get failUpsert() { return failUpsert; },
    set failUpsert(v: boolean) { failUpsert = v; },
  };
});

vi.mock('../lib/persistence/index.js', () => ({
  persistence: () => ({
    async getResume(id: string) {
      await fake.getDelay.get(id);
      return fake.rows.get(id) ?? null;
    },
    async upsertResume(row: ResumeRow) {
      if (fake.failUpsert) throw new Error('upsert failed');
      if (fake.upsertGate) await fake.upsertGate;
      fake.writes.push({ id: row.id, doc: structuredClone(row.doc) });
      fake.rows.set(row.id, structuredClone(row));
    },
    async listResumeMetas() {
      return [...fake.rows.values()].map((r) => ({
        id: r.id, title: r.title, verticalId: r.verticalId, status: r.status,
        updatedAt: r.updatedAt, templateId: r.doc.templateId, snapshotCount: 0,
      }));
    },
    async getSettingRaw(key: string) {
      if (fake.settingDelay) await fake.settingDelay;
      if (key === 'sampleResumeId' && fake.failSampleSettingRead) throw new Error('sample setting read failed');
      return fake.settings.get(key);
    },
    async setSettingRaw(key: string, value: unknown) { fake.settings.set(key, value); },
    async deleteSetting(key: string) {
      if (fake.failDeleteSetting) throw new Error('setting delete failed');
      fake.settings.delete(key);
    },
    async deleteResume(id: string) { fake.rows.delete(id); },
    async listSnapshots() { return []; },
    async insertSnapshot() {},
  }),
}));

import { useEditorDoc } from './editor-doc.js';

const doc = (marker: string): ResumeDoc => ({
  templateId: 'tpl-classic',
  profile: { name: marker },
  sections: [{ id: 'SectConc0001', type: 'basic', title: '基本信息', entries: [] }],
});

const row = (id: string): ResumeRow => ({
  id,
  title: id,
  verticalId: 'general',
  doc: doc(id),
  status: 'active',
  createdAt: '2026-11-23T00:00:00.000Z',
  updatedAt: '2026-11-23T00:00:00.000Z',
});

describe('editor-doc 并发（#129）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fake.rows.clear();
    fake.writes.length = 0;
    fake.getDelay.clear();
    fake.settingDelay = null;
    fake.failDeleteSetting = false;
    fake.failSampleSettingRead = false;
    fake.upsertGate = null;
    fake.failUpsert = false;
    fake.settings.clear();
    useEditorDoc.setState({ ready: false, doc: null, dirty: false, lastError: null, isSample: false });
    fake.rows.set('ResumeAAAA01', row('ResumeAAAA01'));
    fake.rows.set('ResumeBBBB02', row('ResumeBBBB02'));
  });

  it('A/B 乱序：后发起的 B 胜出，A 返回 superseded 且不改 state', async () => {
    let releaseA: () => void = () => {};
    fake.getDelay.set('ResumeAAAA01', new Promise<void>((resolve) => { releaseA = resolve; }));

    const aPromise = useEditorDoc.getState().openResume('ResumeAAAA01');
    const bResult = await useEditorDoc.getState().openResume('ResumeBBBB02');
    expect(bResult).toBe('ok');
    expect(useEditorDoc.getState().resumeId).toBe('ResumeBBBB02');

    releaseA();
    expect(await aPromise).toBe('superseded');
    expect(useEditorDoc.getState().resumeId).toBe('ResumeBBBB02');
  });

  it('B 打开期间 A 的自动保存只写 A 的行', async () => {
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('ok');

    const edited = doc('A-EDITED');
    useEditorDoc.getState().applyDoc(edited); // 800ms 防抖

    // 让 B 的 settings 读取挂起，制造“旧 controller 仍存活”的窗口
    let releaseSettings: () => void = () => {};
    fake.settingDelay = new Promise<void>((resolve) => { releaseSettings = resolve; });
    const bPromise = useEditorDoc.getState().openResume('ResumeBBBB02');
    await Promise.resolve(); // 让 B 走到 settings await

    await vi.advanceTimersByTimeAsync(800); // A 的自动保存在窗口内触发

    const writeA = fake.writes.filter((w) => w.id === 'ResumeAAAA01').at(-1);
    expect(writeA?.doc.profile?.name).toBe('A-EDITED');
    // B 的行从未被 A 的内容污染
    const writeB = fake.writes.filter((w) => w.id === 'ResumeBBBB02');
    expect(writeB.every((w) => w.doc.profile?.name === 'ResumeBBBB02')).toBe(true);
    expect(fake.rows.get('ResumeBBBB02')?.doc.profile?.name).toBe('ResumeBBBB02');

    releaseSettings();
    expect(await bPromise).toBe('ok');
    expect(useEditorDoc.getState().resumeId).toBe('ResumeBBBB02');
  });

  it('清空示例：身份键删除失败不谎报成功，重试成功后才释放', async () => {
    fake.settings.set('sampleResumeId', 'ResumeAAAA01');
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('ok');
    expect(useEditorDoc.getState().isSample).toBe(true);

    fake.failDeleteSetting = true;
    const failed = await useEditorDoc.getState().replaceDoc(doc('CLEARED'), '我的简历');
    expect(failed).toEqual({ ok: true, sampleCleared: false });
    expect(useEditorDoc.getState().isSample).toBe(true);
    expect(useEditorDoc.getState().lastError).toBeTruthy();

    fake.failDeleteSetting = false;
    const ok = await useEditorDoc.getState().replaceDoc(doc('CLEARED-2'), '我的简历');
    expect(ok).toEqual({ ok: true, sampleCleared: true });
    expect(useEditorDoc.getState().isSample).toBe(false);
    expect(fake.settings.has('sampleResumeId')).toBe(false);
  });

  it('打开简历时示例身份读取失败：返回 error，不带着错误身份进入编辑器', async () => {
    fake.settings.set('sampleResumeId', 'ResumeAAAA01');
    fake.failSampleSettingRead = true;
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('error');
    expect(useEditorDoc.getState().ready).toBe(false);
    expect(useEditorDoc.getState().isSample).toBe(false);
    expect(useEditorDoc.getState().lastError).toBeTruthy();

    fake.failSampleSettingRead = false;
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('ok');
    expect(useEditorDoc.getState().isSample).toBe(true);
  });

  it('清空落盘中打开另一份：openResume 等待；旧简历写空白且身份清理，新简历不受影响', async () => {
    fake.settings.set('sampleResumeId', 'ResumeAAAA01');
    fake.settings.set('autosave', false); // 手动模式也走 replaceDoc → saveNow
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('ok');
    expect(useEditorDoc.getState().isSample).toBe(true);

    let release: () => void = () => {};
    fake.upsertGate = new Promise<void>((resolve) => { release = resolve; });
    const replaceP = useEditorDoc.getState().replaceDoc(doc('CLEARED'), '我的简历');
    await Promise.resolve(); // 让 replace 进入保存

    const openB = useEditorDoc.getState().openResume('ResumeBBBB02');
    useEditorDoc.getState().discardPendingChanges(); // 落盘中不可撤销（UI 也保持确认框打开）
    await Promise.resolve();
    expect(useEditorDoc.getState().resumeId).toBe('ResumeAAAA01'); // 仍等旧写入

    release();
    expect(await replaceP).toEqual({ ok: true, sampleCleared: true });
    expect(await openB).toBe('ok');

    expect(fake.rows.get('ResumeAAAA01')?.doc.profile?.name).toBe('CLEARED');
    expect(fake.rows.get('ResumeBBBB02')?.doc.profile?.name).toBe('ResumeBBBB02');
    expect(fake.settings.has('sampleResumeId')).toBe(false);
    expect(useEditorDoc.getState().resumeId).toBe('ResumeBBBB02');
    expect(useEditorDoc.getState().isSample).toBe(false);
  });

  it('清空保存失败：回滚画布/标题/会话行，恢复后保存不会写入空白', async () => {
    fake.settings.set('sampleResumeId', 'ResumeAAAA01');
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('ok');
    const original = useEditorDoc.getState().doc;
    fake.failUpsert = true;

    const failed = await useEditorDoc.getState().replaceDoc(doc('CLEARED'), '我的简历');
    expect(failed).toEqual({ ok: false, sampleCleared: true });
    // 画布与会话行回到清空前；身份仍在
    expect(useEditorDoc.getState().doc).toEqual(original);
    expect(useEditorDoc.getState().resumeTitle).toBe('ResumeAAAA01');
    expect(useEditorDoc.getState().isSample).toBe(true);
    expect(fake.settings.get('sampleResumeId')).toBe('ResumeAAAA01');
    expect(fake.rows.get('ResumeAAAA01')?.doc.profile?.name).toBe('ResumeAAAA01');

    // 恢复后普通保存写入的是原文档，不是空白
    fake.failUpsert = false;
    expect((await useEditorDoc.getState().saveNow()).ok).toBe(true);
    const lastWrite = fake.writes.filter((w) => w.id === 'ResumeAAAA01').at(-1);
    expect(lastWrite?.doc.profile?.name).toBe('ResumeAAAA01');
  });

  it('waitForReplace：清空落盘挂起时不返回，释放后才放行（关窗入口统一等待）', async () => {
    expect(await useEditorDoc.getState().openResume('ResumeAAAA01')).toBe('ok');
    let release: () => void = () => {};
    fake.upsertGate = new Promise<void>((resolve) => { release = resolve; });
    const replaceP = useEditorDoc.getState().replaceDoc(doc('CLEARED'), '我的简历');

    let settled = false;
    const waitP = useEditorDoc.getState().waitForReplace().then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    release();
    await replaceP;
    await waitP;
    expect(settled).toBe(true);
  });
});
