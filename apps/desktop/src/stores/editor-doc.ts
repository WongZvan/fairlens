import { create } from 'zustand';
import { createAutosave, parseSettingValue, sameDoc, type AutosaveController, type SaveStatus } from '@fairlens/core';
import type { ResumeDoc, ResumeRow, SnapshotRow } from '@fairlens/shared';
import { persistence } from '../lib/persistence/index.js';
import { nanoid } from '../lib/nanoid.js';
import { sampleDoc, SAMPLE_RESUME_TITLE } from '../features/editor-mockup/sample-data.js';

/**
 * 编辑器文档状态（m1.6）：当前简历 + 自动保存防抖状态机 + 快照。
 * §5.7 双模式：autosave=true → applyDoc 防抖落盘；false → 仅标 dirty，Ctrl+S（saveNow）落盘。
 * 当前简历选择=m1.6 简化（最近编辑优先，空库建示例）；m1.8 简历库首页接管。
 *
 * 2026-11-13 修复（用户报障）：手动模式的 dirty 原为「发生过编辑」的闩锁——新建要点再删掉、
 * 文档回到打开时原样，关窗仍弹三键框。现改为与 `savedDoc`（最近一次成功落盘的文档）
 * 做内容比较：内容相同即 dirty=false。`savedDoc` 在打开/成功落盘/回滚三处更新。
 */
const AUTOSAVE_DELAY_MS = 800;

let controller: AutosaveController<ResumeDoc> | null = null;
let currentRow: ResumeRow | null = null;

interface EditorDocState {
  ready: boolean;
  resumeId: string | null;
  /** 当前简历记录标题（#127：示例简历识别与清空入口用） */
  resumeTitle: string | null;
  doc: ResumeDoc | null;
  /** 最近一次成功落盘的文档（dirty 判定的基线；不参与渲染） */
  savedDoc: ResumeDoc | null;
  autosave: boolean;
  saveStatus: SaveStatus;
  dirty: boolean;
  lastError: string | null;
  /** 进入编辑器时对齐当前简历（幂等；返回库再进会重开最近编辑行——选择逻辑 m1.8 接管） */
  openCurrent(): Promise<void>;
  /** CanvasEditor onDocChange 唯一入口 */
  applyDoc(doc: ResumeDoc): void;
  /** Ctrl+S：立即落盘（双模式通用）；返回是否真正写入成功——调用方据此决定 toast */
  saveNow(): Promise<{ ok: boolean }>;
  /** 关闭/返回库前的 flush（自动模式落盘挂起变更；手动模式无挂起则 no-op） */
  flushPending(): Promise<{ ok: boolean }>;
  /** 关闭弹窗「不保存」：丢弃挂起变更并把文档复位到最后保存版本 */
  discardPendingChanges(): void;
  createSnapshot(label?: string): Promise<void>;
  listSnapshots(): Promise<SnapshotRow[]>;
  /** 一键回滚：以快照 doc 覆盖当前并立即落盘（快照留档，可再次回滚） */
  restoreSnapshot(id: string): Promise<void>;
  /** 设置→通用「自动保存」开关（§5.7；写 settings 表，跨会话生效） */
  setAutosave(value: boolean): Promise<void>;
  /** #127：整篇替换（清空为空白简历）+ 改记录标题；自动模式落盘、手动模式立即保存。返回是否真正写入成功（#128） */
  replaceDoc(doc: ResumeDoc, title: string): Promise<{ ok: boolean }>;
}

export const useEditorDoc = create<EditorDocState>((set, get) => {
  const persistDoc = async (doc: ResumeDoc) => {
    if (!currentRow) throw new Error('编辑器未初始化');
    const updated: ResumeRow = { ...currentRow, doc, updatedAt: new Date().toISOString() };
    currentRow = updated;
    await persistence().upsertResume(updated);
    // 基线只在**成功**落盘后推进：写库失败时 savedDoc 保持旧值，dirty 仍为真（不谎报已保存）
    set({ savedDoc: doc });
  };

  return {
    ready: false,
    resumeId: null,
    resumeTitle: null,
    doc: null,
    savedDoc: null,
    autosave: true,
    saveStatus: 'idle',
    dirty: false,
    lastError: null,

    async openCurrent() {
      const port = persistence();
      let row: ResumeRow | null = null;
      let loadError: string | null = null;
      try {
        const meta = (await port.listResumeMetas())[0] ?? null;
        row = meta ? await port.getResume(meta.id) : null;
      } catch (err) {
        // 旧数据/适配器异常：不让编辑区留白——记录错误并走新建兜底（#109）
        loadError = String(err);
        console.error('[editor-doc] 加载当前简历失败，回退新建示例', err);
      }
      if (!row) {
        const now = new Date().toISOString();
        row = { id: nanoid(), title: SAMPLE_RESUME_TITLE, verticalId: 'general', doc: sampleDoc, status: 'active', createdAt: now, updatedAt: now };
        try {
          await port.upsertResume(row);
        } catch (err) {
          loadError = loadError ? `${loadError} / ${String(err)}` : String(err);
        }
      }
      currentRow = row;
      const autosave = parseSettingValue('autosave', await port.getSettingRaw('autosave').catch(() => undefined));
      controller?.destroy();
      controller = createAutosave<ResumeDoc>({
        delayMs: AUTOSAVE_DELAY_MS,
        save: (doc) => persistDoc(doc),
        onStatus: (s) => set({ saveStatus: s, dirty: s === 'pending' || s === 'saving' || s === 'error' }),
        onError: (err) => set({ lastError: String(err) }),
      });
      set({
        ready: true,
        resumeId: row.id,
        resumeTitle: row.title,
        doc: row.doc,
        savedDoc: row.doc,
        autosave,
        saveStatus: 'saved',
        dirty: false,
        lastError: loadError,
      });
    },

    applyDoc(doc) {
      if (!get().ready) return;
      set({ doc });
      if (get().autosave) {
        controller?.schedule(doc);
      } else {
        // 手动模式：与基线比较，而不是"编辑过就脏"（修复：新建要点再删掉仍弹三键框）
        set({ dirty: !sameDoc(get().savedDoc, doc) });
      }
    },

    async saveNow() {
      const doc = get().doc;
      if (!doc || !currentRow) return { ok: false };
      controller?.schedule(doc); // 两模式统一走控制器（自动模式顺带取消挂起防抖合并写入）
      const result = await controller?.flush();
      // 手动模式用基线比较兜底：保存失败时 controller.dirty() 已为真，不会误清
      set({ dirty: get().autosave ? (controller?.dirty() ?? false) : !sameDoc(get().savedDoc, get().doc) });
      return { ok: result?.ok ?? false };
    },

    async flushPending() {
      // 手动模式（§5.7 Word 式）：不 flush、不改写 dirty——未保存状态由用户保存/丢弃决定
      if (!get().autosave) return { ok: true };
      const result = controller ? await controller.flush() : { ok: true };
      set({ dirty: controller?.dirty() ?? false });
      return { ok: result.ok };
    },

    discardPendingChanges() {
      controller?.discardPending();
      // 丢弃 = 回到最后保存版本（原实现只清标记，视图里仍留着未保存内容——用户会以为已丢弃）
      const saved = get().savedDoc;
      set(saved ? { doc: saved, dirty: false } : { dirty: false });
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
      if (value === get().autosave) return;
      // 切到手动前先落盘：清掉自动模式的挂起计时器，避免旧计时器稍后把新改动的 dirty 冲掉
      if (!value && get().dirty) await get().saveNow();
      try {
        await persistence().setSettingRaw('autosave', value);
      } catch (err) {
        // 写库失败：保持原模式并留痕（不再静默停在旧状态）
        set({ lastError: String(err) });
        return;
      }
      set({ autosave: value, saveStatus: 'saved' });
      // 切到自动：把手动模式下积压的未保存变更立即落盘
      if (value && get().dirty) await get().saveNow();
    },

    async replaceDoc(doc, title) {
      if (!currentRow) return { ok: false };
      // 丢弃挂起的旧文档变更，避免防抖计时器把刚清空的文档又写回旧内容
      controller?.discardPending();
      currentRow = { ...currentRow, title, doc, updatedAt: new Date().toISOString() };
      set({ doc, resumeTitle: title, dirty: get().autosave ? false : true });
      // #128：把落盘结果交给调用方——失败时不得 toast「已清空」
      return get().saveNow();
    },
  };
});
