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
 * 并发模型（2026-11-23，codex 复核）：`init()` 是单飞 Promise；所有写操作先 `await init()`，
 * 保证「播种判定 → 新建」严格串行——模板卡不会抢在示例播种前落库。
 * 删除依赖持久层四表级联（SQL）或适配器显式清快照（memory）。
 */
interface LibraryState {
  metas: ResumeMeta[];
  loading: boolean;
  /** init 完成（库页模板卡在此之前禁用） */
  initialized: boolean;
  error: string | null;
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
  }): Promise<string | null>;
  rename(id: string, title: string): Promise<boolean>;
  setArchived(id: string, archived: boolean): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}

export const useLibrary = create<LibraryState>((set, get) => {
  let initPromise: Promise<void> | null = null;
  /** 新建串行链：连续点击也按顺序分配标题（「我的简历 / 我的简历 2」） */
  let createChain: Promise<unknown> = Promise.resolve();

  const loadSampleId = async (): Promise<string | null> => {
    const raw = await persistence().getSettingRaw('sampleResumeId').catch(() => null);
    const id = typeof raw === 'string' ? raw : null;
    set({ sampleResumeId: id });
    return id;
  };

  const refreshInner = async () => {
    set({ loading: true });
    try {
      const metas = await persistence().listResumeMetas();
      // 每次刷新都重读示例身份：编辑器“清空示例”会删键，库页返回时必须同步
      await loadSampleId();
      set({ metas, error: null });
    } catch (err) {
      // 不吞错：init 必须失败并给出重试入口，操作后刷新失败也不能报成功
      set({ error: String(err) });
      throw err;
    } finally {
      set({ loading: false });
    }
  };

  /**
   * 旧库识别（仅迁移用）：唯一标题 + 文档仍与内置示例完全一致才认定为示例。
   * 避免把用户自己改成同名的简历误认；若示例被编辑过则无法安全识别（不猜）。
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
    const rawId = await persistence().getSettingRaw('sampleResumeId');
    // 身份指向已删除的记录 → 清掉，避免把别的简历当示例
    let storedId = typeof rawId === 'string' ? rawId : null;
    if (storedId && !metas.some((m) => m.id === storedId)) {
      await persistence().deleteSetting('sampleResumeId').catch(() => undefined);
      storedId = null;
    }

    const action = resolveSeedAction(marker, metas.length);
    if (action === 'none') {
      // 上一版只写了 sampleSeeded、没写样本身份：补一次安全回填
      if (!storedId) {
        const legacy = await findLegacySample(metas);
        if (legacy) await persistence().setSettingRaw('sampleResumeId', legacy);
      }
      await loadSampleId();
      return;
    }
    if (action === 'mark-only') {
      if (!storedId) {
        const legacy = await findLegacySample(metas);
        if (legacy) await persistence().setSettingRaw('sampleResumeId', legacy);
      }
      await persistence().setSettingRaw('sampleSeeded', true);
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
    set({ sampleResumeId: id });
    await refreshInner();
  };

  return {
    metas: [],
    loading: false,
    initialized: false,
    error: null,
    sampleResumeId: null,

    init() {
      initPromise ??= (async () => {
        try {
          await seedIfNeeded();
          await refreshInner();
          set({ initialized: true, error: null });
        } catch (err) {
          initPromise = null; // 允许重试
          set({ error: String(err) });
          throw err;
        }
      })();
      return initPromise;
    },

    refresh() {
      return refreshInner();
    },

    createFromTemplate(input) {
      const run = async (): Promise<string | null> => {
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
          await get().refresh();
          return id;
        } catch (err) {
          set({ error: String(err) });
          return null;
        }
      };
      const task = createChain.then(run, run);
      createChain = task.then(() => undefined, () => undefined);
      return task;
    },

    async rename(id, title) {
      const trimmed = title.trim();
      if (!trimmed) return false;
      try {
        await get().init();
        const row = await persistence().getResume(id);
        if (!row) return false;
        // 重命名不推进 updatedAt：卡片“最近编辑”应反映内容修改
        await persistence().upsertResume({ ...row, title: trimmed });
        await get().refresh();
        return true;
      } catch (err) {
        set({ error: String(err) });
        return false;
      }
    },

    async setArchived(id, archived) {
      try {
        await get().init();
        const row = await persistence().getResume(id);
        if (!row) return false;
        await persistence().upsertResume({ ...row, status: archived ? 'archived' : 'active' });
        await get().refresh();
        return true;
      } catch (err) {
        set({ error: String(err) });
        return false;
      }
    },

    async remove(id) {
      try {
        await get().init();
        await persistence().deleteResume(id);
        // 示例被删：清掉稳定身份，避免下次启动把别的记录当示例
        if (get().sampleResumeId === id) {
          await persistence().deleteSetting('sampleResumeId').catch(() => undefined);
          set({ sampleResumeId: null });
        }
        await get().refresh();
        return true;
      } catch (err) {
        set({ error: String(err) });
        return false;
      }
    },
  };
});
