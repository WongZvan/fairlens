import { create } from 'zustand';
import { createAutosave, parseSettingValue, type AutosaveController, type SaveStatus } from '@fairlens/core';
import type { ResumeDoc, ResumeRow, SnapshotRow } from '@fairlens/shared';
import { persistence } from '../lib/persistence/index.js';
import { nanoid } from '../lib/nanoid.js';
import { sampleDoc } from '../features/editor-mockup/sample-data.js';

/**
 * 编辑器文档状态（m1.6）：当前简历 + 自动保存防抖状态机 + 快照。
 * §5.7 双模式：autosave=true → applyDoc 防抖落盘；false → 仅标 dirty，Ctrl+S（saveNow）落盘。
 * 当前简历选择=m1.6 简化（最近编辑优先，空库建示例）；m1.8 简历库首页接管。
 */
const AUTOSAVE_DELAY_MS = 800;

let controller: AutosaveController<ResumeDoc> | null = null;
let currentRow: ResumeRow | null = null;

interface EditorDocState {
  ready: boolean;
  resumeId: string | null;
  doc: ResumeDoc | null;
  autosave: boolean;
  saveStatus: SaveStatus;
  dirty: boolean;
  lastError: string | null;
  /** 进入编辑器时对齐当前简历（幂等；返回库再进会重开最近编辑行——选择逻辑 m1.8 接管） */
  openCurrent(): Promise<void>;
  /** CanvasEditor onDocChange 唯一入口 */
  applyDoc(doc: ResumeDoc): void;
  /** Ctrl+S：立即落盘（双模式通用） */
  saveNow(): Promise<void>;
  /** 关闭/返回库前的 flush（自动模式落盘挂起变更；手动模式无挂起则 no-op） */
  flushPending(): Promise<void>;
  /** 关闭弹窗「不保存」：丢弃挂起变更 */
  discardPendingChanges(): void;
  createSnapshot(label?: string): Promise<void>;
  listSnapshots(): Promise<SnapshotRow[]>;
  /** 一键回滚：以快照 doc 覆盖当前并立即落盘（快照留档，可再次回滚） */
  restoreSnapshot(id: string): Promise<void>;
  /** 设置→通用「自动保存」开关（§5.7；写 settings 表，跨会话生效） */
  setAutosave(value: boolean): Promise<void>;
}

export const useEditorDoc = create<EditorDocState>((set, get) => {
  const persistDoc = async (doc: ResumeDoc) => {
    if (!currentRow) throw new Error('编辑器未初始化');
    const updated: ResumeRow = { ...currentRow, doc, updatedAt: new Date().toISOString() };
    currentRow = updated;
    await persistence().upsertResume(updated);
  };

  return {
    ready: false,
    resumeId: null,
    doc: null,
    autosave: true,
    saveStatus: 'idle',
    dirty: false,
    lastError: null,

    async openCurrent() {
      const port = persistence();
      const meta = (await port.listResumeMetas())[0] ?? null;
      let row: ResumeRow | null = meta ? await port.getResume(meta.id) : null;
      if (!row) {
        const now = new Date().toISOString();
        row = { id: nanoid(), title: '示例简历', verticalId: 'general', doc: sampleDoc, status: 'active', createdAt: now, updatedAt: now };
        await port.upsertResume(row);
      }
      currentRow = row;
      const autosave = parseSettingValue('autosave', await port.getSettingRaw('autosave'));
      controller?.destroy();
      controller = createAutosave<ResumeDoc>({
        delayMs: AUTOSAVE_DELAY_MS,
        save: (doc) => persistDoc(doc),
        onStatus: (s) => set({ saveStatus: s, dirty: s === 'pending' || s === 'saving' || s === 'error' }),
        onError: (err) => set({ lastError: String(err) }),
      });
      set({ ready: true, resumeId: row.id, doc: row.doc, autosave, saveStatus: 'saved', dirty: false, lastError: null });
    },

    applyDoc(doc) {
      if (!get().ready) return;
      set({ doc });
      if (get().autosave) {
        controller?.schedule(doc);
      } else {
        set({ dirty: true }); // 手动模式：仅标 dirty（§5.7 Word 式）
      }
    },

    async saveNow() {
      const doc = get().doc;
      if (!doc || !currentRow) return;
      controller?.schedule(doc); // 两模式统一走控制器（自动模式顺带取消挂起防抖合并写入）
      await controller?.flush();
      set({ dirty: controller?.dirty() ?? false });
    },

    async flushPending() {
      if (controller) await controller.flush();
      set({ dirty: controller?.dirty() ?? false });
    },

    discardPendingChanges() {
      controller?.discardPending();
      set({ dirty: false });
    },

    async createSnapshot(label) {
      const doc = get().doc;
      if (!doc || !currentRow) return;
      await persistence().insertSnapshot({
        id: nanoid(),
        resumeId: currentRow.id,
        doc,
        label,
        trigger: 'manual',
        createdAt: new Date().toISOString(),
      });
    },

    async listSnapshots() {
      return currentRow ? persistence().listSnapshots(currentRow.id) : [];
    },

    async restoreSnapshot(id) {
      if (!currentRow) return;
      const snaps = await persistence().listSnapshots(currentRow.id);
      const snap = snaps.find((s) => s.id === id);
      if (!snap) return;
      controller?.discardPending(); // 回滚基线替换：丢弃挂起变更
      set({ doc: snap.doc, dirty: false });
      await persistDoc(snap.doc);
    },

    async setAutosave(value) {
      await persistence().setSettingRaw('autosave', value);
      set({ autosave: value });
      // 切到自动保存：把手动模式下积压的未保存变更立即落盘（避免"看似已保存"的假象）
      if (value && get().dirty) {
        await get().saveNow();
      }
    },
  };
});
