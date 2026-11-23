import { create } from 'zustand';
import { sameDoc, type ResumeMeta } from '@fairlens/core';
import { persistence } from '../lib/persistence/index.js';
import { nanoid } from '../lib/nanoid.js';
import { createBlankDoc } from '../features/editor-mockup/blank-doc.js';
import { sampleDoc, SAMPLE_RESUME_TITLE } from '../features/editor-mockup/sample-data.js';
import { nextResumeTitle, resolveSeedAction } from '../features/library/library-view-model.js';

/**
 * 简历库状态（m1.8 / #129）：记录列表 + 新建/重命名/软归档/删除 + 首启示例播种。
 *
 * 并发/失败模型（2026-11-23，codex 两轮复核）：
 *  - `init()` 单飞；写操作先 `await init()`；`initialized` 前模板卡禁用。
 *  - 写操作返回 `WriteOutcome`：写入失败与「写入成功但刷新失败」分开，UI 反馈才准确。
 *  - `refreshInner` 带请求序号：较早发起的旧列表查询不得覆盖较新的结果。
 *  - 示例身份 `sampleResumeId` 读取失败不当作“没有示例”；旧库回填只尝试一次（`sampleIdentityMigrated`）。
 */
export type WriteOutcome = 'ok' | 'write-failed' | 'refresh-failed';
export interface CreateOutcome {
  id: string | null;
  outcome: WriteOutcome;
}

interface LibraryState {
  metas: ResumeMeta[];
  loading: boolean;
  /** init 完成（库页模板卡在此之前禁用） */
  initialized: boolean;
  /** 最近一次错误（写失败与同步失败共用，供测试/诊断） */
  error: string | null;
  /** 仅列表/初始化同步错误（库页顶部重试条显示这个，写失败由弹窗/toast 呈现） */
  syncError: string | null;
  /** 系统示例的稳定身份（settings.sampleResumeId） */
  sampleResumeId: string | null;
  /** 启动初始化：播种判定 → 拉列表；单飞、失败可重试 */
  init(): Promise<void>;
  refresh(): Promise<void>;
  createFromTemplate(input: {
    templateId: string;
    /** 标题基名（i18n：我的简历） */
    titleBase: string;
    /** 空白基本信息分区标题（i18n：基本信息） */
    basicSection: string;
  }): Promise<CreateOutcome>;
  rename(id: string, title: string): Promise<WriteOutcome>;
  setArchived(id: string, archived: boolean): Promise<WriteOutcome>;
  remove(id: string): Promise<WriteOutcome>;
}

export const useLibrary = create<LibraryState>((set, get) => {
  let initPromise: Promise<void> | null = null;
  /** 新建串行链：连续点击也按顺序分配标题（「我的简历 / 我的简历 2」） */
  let createChain: Promise<unknown> = Promise.resolve();
  /** 列表刷新序号：旧请求晚到不得覆盖新结果 */
  let refreshSeq = 0;

  /** 读取示例身份：失败抛出（不能误判为“没有示例”而清掉徽标） */
  const readSampleId = async (): Promise<string | null> => {
    const raw = await persistence().getSettingRaw('sampleResumeId');
    return typeof raw === 'string' ? raw : null;
  };

  const loadSampleId = async (): Promise<string | null> => {
    const id = await readSampleId();
    set({ sampleResumeId: id });
    return id;
  };

  const refreshInner = async () => {
    const seq = ++refreshSeq;
    set({ loading: true });
    try {
      const metas = await persistence().listResumeMetas();
      if (seq !== refreshSeq) return; // 被更新的刷新超越
      const id = await readSampleId();
      if (seq !== refreshSeq) return;
      set({ metas, sampleResumeId: id, error: null, syncError: null });
    } catch (err) {
      // 旧请求失败不影响新请求；只有最新请求把错误暴露给 UI
      if (seq !== refreshSeq) return;
      set({ error: String(err), syncError: String(err) });
      throw err;
    } finally {
      if (seq === refreshSeq) set({ loading: false });
    }
  };

  /**
   * 旧库识别（仅迁移一次）：唯一标题 + 文档仍与内置示例完全一致才认定为示例。
   * 避免把用户自己改成同名的简历误认；示例被编辑/重命名过则无法安全识别（不猜）。
   */
  const findLegacySample = async (metas: ResumeMeta[]): Promise<string | null> => {
    const candidates = metas.filter((m) => m.title === SAMPLE_RESUME_TITLE);
    if (candidates.length !== 1) return null;
    const row = await persistence().getResume(candidates[0]!.id).catch(() => null);
    if (!row) return null;
    return sameDoc(row.doc, sampleDoc) ? row.id : null;
  };

  const seedIfNeeded = async () => {
    const marker = (await persistence().getSettingRaw('sampleSeeded')) === true;
    const metas = await persistence().listResumeMetas();
    const migrated = (await persistence().getSettingRaw('sampleIdentityMigrated')) === true;
    const rawId = await persistence().getSettingRaw('sampleResumeId');

    // 身份指向已删除的记录 → 清掉（失败要暴露，不能静默把悬空 id 当示例）
    let storedId = typeof rawId === 'string' ? rawId : null;
    if (storedId && !metas.some((m) => m.id === storedId)) {
      await persistence().deleteSetting('sampleResumeId');
      storedId = null;
    }

    const action = resolveSeedAction(marker, metas.length);
    if (action === 'none' || action === 'mark-only') {
      // 上一版只写过 sampleSeeded：身份回填只尝试一次
      if (!storedId && !migrated) {
        const legacy = await findLegacySample(metas);
        if (legacy) await persistence().setSettingRaw('sampleResumeId', legacy);
        await persistence().setSettingRaw('sampleIdentityMigrated', true);
      } else if (!migrated) {
        await persistence().setSettingRaw('sampleIdentityMigrated', true);
      }
      if (action === 'mark-only') await persistence().setSettingRaw('sampleSeeded', true);
      await loadSampleId();
      return;
    }

    const now = new Date().toISOString();
    const id = nanoid();
    await persistence().upsertResume({
      id,
      title: SAMPLE_RESUME_TITLE,
      verticalId: 'general',
      doc: sampleDoc,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await persistence().setSettingRaw('sampleResumeId', id);
    await persistence().setSettingRaw('sampleSeeded', true);
    await persistence().setSettingRaw('sampleIdentityMigrated', true);
    set({ sampleResumeId: id });
    await refreshInner();
  };

  /** 写成功后刷新；distinguish 写入失败 vs 刷新失败 */
  const refreshAfterWrite = async (): Promise<WriteOutcome> => {
    try {
      await refreshInner();
      return 'ok';
    } catch {
      return 'refresh-failed';
    }
  };

  return {
    metas: [],
    loading: false,
    initialized: false,
    error: null,
    syncError: null,
    sampleResumeId: null,

    init() {
      initPromise ??= (async () => {
        try {
          await seedIfNeeded();
          await refreshInner();
          set({ initialized: true, error: null, syncError: null });
        } catch (err) {
          initPromise = null; // 允许重试
          set({ error: String(err), syncError: String(err) });
          throw err;
        }
      })();
      return initPromise;
    },

    refresh() {
      return refreshInner();
    },

    createFromTemplate(input) {
      const run = async (): Promise<CreateOutcome> => {
        try {
          await get().init();
          // 串行链 + 每次读最新列表：连续点击也得到「我的简历 / 我的简历 2」
          const metas = await persistence().listResumeMetas();
          const title = nextResumeTitle(input.titleBase, metas.map((m) => m.title));
          const now = new Date().toISOString();
          const id = nanoid();
          await persistence().upsertResume({
            id,
            title,
            verticalId: 'general',
            doc: createBlankDoc({ basicSection: input.basicSection }, input.templateId),
            status: 'active',
            createdAt: now,
            updatedAt: now,
          });
          const outcome = await refreshAfterWrite();
          return { id, outcome };
        } catch (err) {
          set({ error: String(err) });
          return { id: null, outcome: 'write-failed' };
        }
      };
      const task = createChain.then(run, run);
      createChain = task.then(() => undefined, () => undefined);
      return task;
    },

    async rename(id, title) {
      const trimmed = title.trim();
      if (!trimmed) return 'write-failed';
      try {
        await get().init();
      } catch {
        return 'write-failed';
      }
      let row;
      try {
        row = await persistence().getResume(id);
      } catch (err) {
        set({ error: String(err) });
        return 'write-failed';
      }
      if (!row) {
        set({ error: `简历不存在：${id}` });
        return 'write-failed';
      }
      try {
        // 重命名不推进 updatedAt：卡片“最近编辑”应反映内容修改
        await persistence().upsertResume({ ...row, title: trimmed });
      } catch (err) {
        set({ error: String(err) });
        return 'write-failed';
      }
      return refreshAfterWrite();
    },

    async setArchived(id, archived) {
      try {
        await get().init();
      } catch {
        return 'write-failed';
      }
      let row;
      try {
        row = await persistence().getResume(id);
      } catch (err) {
        set({ error: String(err) });
        return 'write-failed';
      }
      if (!row) {
        set({ error: `简历不存在：${id}` });
        return 'write-failed';
      }
      try {
        await persistence().upsertResume({ ...row, status: archived ? 'archived' : 'active' });
      } catch (err) {
        set({ error: String(err) });
        return 'write-failed';
      }
      return refreshAfterWrite();
    },

    async remove(id) {
      try {
        await get().init();
        await persistence().deleteResume(id);
      } catch (err) {
        set({ error: String(err) });
        return 'write-failed';
      }
      // 示例被删：清掉稳定身份；失败要可见（仍返回 refresh-failed 让 UI 提示重新加载）
      let identityCleanupFailed = false;
      if (get().sampleResumeId === id) {
        try {
          await persistence().deleteSetting('sampleResumeId');
          set({ sampleResumeId: null });
        } catch (err) {
          identityCleanupFailed = true;
          set({ error: String(err) });
        }
      }
      const outcome = await refreshAfterWrite();
      return outcome === 'ok' && identityCleanupFailed ? 'refresh-failed' : outcome;
    },
  };
});
