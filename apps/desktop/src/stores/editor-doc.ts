import { create } from 'zustand';
import { createAutosave, parseSettingValue, sameDoc, type AutosaveController, type SaveStatus } from '@fairlens/core';
import type { ResumeDoc, ResumeRow, SnapshotRow } from '@fairlens/shared';
import { persistence } from '../lib/persistence/index.js';
import { nanoid } from '../lib/nanoid.js';

/**
 * 编辑器文档状态（m1.6）：当前简历 + 自动保存防抖状态机 + 快照。
 * §5.7 双模式：autosave=true → applyDoc 防抖落盘；false → 仅标 dirty，Ctrl+S（saveNow）落盘。
 * m1.8（#129）：由库页显式 `openResume(id)`；示例播种移到 library store，编辑器不再“查不到就建示例”。
 *
 * 并发模型（2026-11-23，codex 复核）：每个打开的文档 = 一个 `EditorSession`（row + controller）。
 * 保存函数闭包绑定自己的 session，因此即使连续打开 A/B、旧防抖在窗口期触发，也只会写回 A 的行。
 * `openSeq` 让后发起的打开胜出：先完成但已被超越的请求返回 `superseded`，不改 state。
 *
 * 2026-11-13 修复（用户报障）：手动模式的 dirty 原为「发生过编辑」的闩锁——新建要点再删掉、
 * 文档回到打开时原样，关窗仍弹三键框。现改为与 `savedDoc`（最近一次成功落盘的文档）
 * 做内容比较：内容相同即 dirty=false。`savedDoc` 在打开/成功落盘/回滚三处更新。
 */
const AUTOSAVE_DELAY_MS = 800;

export type OpenResumeResult = 'ok' | 'superseded' | 'error';

interface EditorSession {
  row: ResumeRow;
  controller: AutosaveController<ResumeDoc>;
}

let session: EditorSession | null = null;
let openSeq = 0;

interface EditorDocState {
  ready: boolean;
  resumeId: string | null;
  /** 当前简历记录标题（#127：清空入口用） */
  resumeTitle: string | null;
  /** 是否为系统示例（settings.sampleResumeId 判定；#129 不再用可编辑标题） */
  isSample: boolean;
  doc: ResumeDoc | null;
  /** 最近一次成功落盘的文档（dirty 判定的基线；不参与渲染） */
  savedDoc: ResumeDoc | null;
  autosave: boolean;
  saveStatus: SaveStatus;
  dirty: boolean;
  lastError: string | null;
  /**
   * 打开指定简历（m1.8；库页唯一入口）。
   * `superseded` = 已被更晚的打开请求超越（调用方应静默）；`error` = 读取/不存在。
   */
  openResume(id: string): Promise<OpenResumeResult>;
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
  /** #127：整篇替换（清空为空白简历）+ 改记录标题；自动模式落盘、手动模式立即保存。
   *  `sampleCleared=false` = 文档已清空，但示例身份键删除失败（清空入口会复活，需重试） */
  replaceDoc(doc: ResumeDoc, title: string): Promise<{ ok: boolean; sampleCleared: boolean }>;
}

export const useEditorDoc = create<EditorDocState>((set, get) => {
  /** 保存闭包绑定 session：绝不读取“当前全局 row”，避免 A 的文档写进 B 的记录 */
  const persistFor = async (s: EditorSession, doc: ResumeDoc) => {
    const updated: ResumeRow = { ...s.row, doc, updatedAt: new Date().toISOString() };
    s.row = updated;
    await persistence().upsertResume(updated);
    // 基线只在**成功**落盘后推进；且只更新仍是当前会话的 UI
    if (session === s) set({ savedDoc: doc });
  };

  const makeSession = (row: ResumeRow): EditorSession => {
    const s = { row, controller: null as unknown as AutosaveController<ResumeDoc> };
    s.controller = createAutosave<ResumeDoc>({
      delayMs: AUTOSAVE_DELAY_MS,
      save: (doc) => persistFor(s, doc),
      // 过期会话的状态/错误不得覆盖当前编辑中的 UI
      onStatus: (status) => {
        if (session !== s) return;
        set({ saveStatus: status, dirty: status === 'pending' || status === 'saving' || status === 'error' });
      },
      onError: (err) => {
        if (session === s) set({ lastError: String(err) });
      },
    });
    return s;
  };

  return {
    ready: false,
    resumeId: null,
    resumeTitle: null,
    isSample: false,
    doc: null,
    savedDoc: null,
    autosave: true,
    saveStatus: 'idle',
    dirty: false,
    lastError: null,

    async openResume(id) {
      const seq = ++openSeq;
      const port = persistence();
      let row: ResumeRow | null = null;
      let loadError: string | null = null;
      try {
        row = await port.getResume(id);
      } catch (err) {
        // 旧数据/适配器异常：记录错误，不建替身文档（#129：编辑器不再播种）
        loadError = String(err);
        console.error('[editor-doc] 打开简历失败', id, err);
      }
      if (seq !== openSeq) return 'superseded';
      if (!row) {
        set({ lastError: loadError ?? `简历不存在：${id}` });
        return 'error';
      }

      const [rawAutosave, rawSampleId] = await Promise.all([
        port.getSettingRaw('autosave').catch(() => undefined),
        port.getSettingRaw('sampleResumeId').catch(() => null),
      ]);
      // 关键：这个 await 窗口里可能已有更晚的打开请求；旧 controller 仍存活，但保存已绑定旧 session
      if (seq !== openSeq) return 'superseded';

      const next = makeSession(row);
      const prev = session;
      session = next;
      prev?.controller.destroy();

      set({
        ready: true,
        resumeId: row.id,
        resumeTitle: row.title,
        isSample: rawSampleId === row.id,
        doc: row.doc,
        savedDoc: row.doc,
        autosave: parseSettingValue('autosave', rawAutosave),
        saveStatus: 'saved',
        dirty: false,
        lastError: loadError,
      });
      return 'ok';
    },

    applyDoc(doc) {
      if (!get().ready) return;
      set({ doc });
      if (get().autosave) {
        session?.controller.schedule(doc);
      } else {
        // 手动模式：与基线比较，而不是"编辑过就脏"（修复：新建要点再删掉仍弹三键框）
        set({ dirty: !sameDoc(get().savedDoc, doc) });
      }
    },

    async saveNow() {
      const s = session;
      const doc = get().doc;
      if (!doc || !s) return { ok: false };
      s.controller.schedule(doc); // 两模式统一走控制器（自动模式顺带取消挂起防抖合并写入）
      const result = await s.controller.flush();
      // 手动模式用基线比较兜底：保存失败时 controller.dirty() 已为真，不会误清
      if (session === s) {
        set({ dirty: get().autosave ? s.controller.dirty() : !sameDoc(get().savedDoc, get().doc) });
      }
      return { ok: result.ok };
    },

    async flushPending() {
      // 手动模式（§5.7 Word 式）：不 flush、不改写 dirty——未保存状态由用户保存/丢弃决定
      if (!get().autosave) return { ok: true };
      const s = session;
      const result = s ? await s.controller.flush() : { ok: true };
      if (s && session === s) set({ dirty: s.controller.dirty() });
      return { ok: result.ok };
    },

    discardPendingChanges() {
      session?.controller.discardPending();
      // 丢弃 = 回到最后保存版本（原实现只清标记，视图里仍留着未保存内容——用户会以为已丢弃）
      const saved = get().savedDoc;
      set(saved ? { doc: saved, dirty: false } : { dirty: false });
    },

    async createSnapshot(label) {
      const s = session;
      const doc = get().doc;
      if (!doc || !s) return;
      await persistence().insertSnapshot({
        id: nanoid(),
        resumeId: s.row.id,
        doc,
        label,
        trigger: 'manual',
        createdAt: new Date().toISOString(),
      });
    },

    async listSnapshots() {
      return session ? persistence().listSnapshots(session.row.id) : [];
    },

    async restoreSnapshot(id) {
      const s = session;
      if (!s) return;
      const snaps = await persistence().listSnapshots(s.row.id);
      const snap = snaps.find((x) => x.id === id);
      if (!snap) return;
      if (session !== s) return; // 打开别的简历后，旧回滚不得落到新会话
      s.controller.discardPending(); // 回滚基线替换：丢弃挂起变更
      set({ doc: snap.doc, dirty: false });
      await persistFor(s, snap.doc);
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
      const s = session;
      if (!s) return { ok: false, sampleCleared: true };
      // 丢弃挂起的旧文档变更，避免防抖计时器把刚清空的文档又写回旧内容
      s.controller.discardPending();
      s.row = { ...s.row, title, doc, updatedAt: new Date().toISOString() };
      set({ doc, resumeTitle: title, dirty: get().autosave ? false : true });
      // #128：把落盘结果交给调用方——失败时不得 toast「已清空」
      const result = await get().saveNow();
      // #129：清空示例 = 不再是指样本身份；删除键失败要如实告知（否则清空入口会复活）
      let sampleCleared = true;
      if (result.ok && get().isSample) {
        try {
          await persistence().deleteSetting('sampleResumeId');
          set({ isSample: false });
        } catch (err) {
          sampleCleared = false;
          set({ lastError: String(err) });
        }
      }
      return { ok: result.ok, sampleCleared };
    },
  };
});
