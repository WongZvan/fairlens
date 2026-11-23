import { create } from 'zustand';
import type { ResumeMeta } from '@fairlens/core';
import { persistence } from '../lib/persistence/index.js';
import { nanoid } from '../lib/nanoid.js';
import { createBlankDoc } from '../features/editor-mockup/blank-doc.js';
import { sampleDoc, SAMPLE_RESUME_TITLE } from '../features/editor-mockup/sample-data.js';
import { nextResumeTitle, resolveSeedAction } from '../features/library/library-view-model.js';

/**
 * 简历库状态（m1.8 / #129）：记录列表 + 新建/重命名/软归档/删除 + 首启示例播种。
 * 只拿轻量 meta（templateId / snapshotCount），不加载 doc_json。
 * 删除依赖持久层的四表级联（SQL）或适配器显式清快照（memory）。
 */
interface LibraryState {
  metas: ResumeMeta[];
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  /** 首启三态：标记真→不动；标记缺失且已有简历→只补标记；标记缺失且空库→播种 */
  ensureSeedSample(): Promise<void>;
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

export const useLibrary = create<LibraryState>((set, get) => ({
  metas: [],
  loading: false,
  error: null,

  async refresh() {
    set({ loading: true });
    try {
      const metas = await persistence().listResumeMetas();
      set({ metas, error: null });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ loading: false });
    }
  },

  async ensureSeedSample() {
    try {
      const marker = (await persistence().getSettingRaw('sampleSeeded')) === true;
      const metas = await persistence().listResumeMetas();
      const action = resolveSeedAction(marker, metas.length);
      if (action === 'none') return;
      if (action === 'mark-only') {
        await persistence().setSettingRaw('sampleSeeded', true);
        return;
      }
      const now = new Date().toISOString();
      await persistence().upsertResume({
        id: nanoid(),
        title: SAMPLE_RESUME_TITLE,
        verticalId: 'general',
        doc: sampleDoc,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      await persistence().setSettingRaw('sampleSeeded', true);
      await get().refresh();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  async createFromTemplate(input) {
    try {
      const metas = get().metas.length ? get().metas : await persistence().listResumeMetas();
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
  },

  async rename(id, title) {
    const trimmed = title.trim();
    if (!trimmed) return false;
    try {
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
      await persistence().deleteResume(id);
      await get().refresh();
      return true;
    } catch (err) {
      set({ error: String(err) });
      return false;
    }
  },
}));
