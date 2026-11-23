import {
  ChevronLeft, ChevronRight, Minus, PanelRightClose, Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import type { ResumeDoc } from '@fairlens/shared';
import { useMockup } from '../../stores/mockup.js';
import { useEditorDoc } from '../../stores/editor-doc.js';
import { CanvasEditor, type EditorApi } from '../editor/CanvasEditor.js';
import { SnapshotDialog } from './SnapshotDialog.js';
import { SectionDialog } from '../editor/nodeviews/SectionDialog.js';
import { SearchBar } from '../editor/SearchBar.js';
import { toast } from '../../app/Toast.js';
import { ConfirmDialog } from '../../app/ConfirmDialog.js';
import { createBlankDoc } from './blank-doc.js';
import { resolveShortcut, shouldIgnoreShortcut } from '../editor/shortcuts.js';
import { registerEditorActions } from '../editor/editor-action-bus.js';
import { commandRegistry } from '../editor/command-registry.js';
import { OutlineTreeLive } from './OutlineTreeLive.js';
import { CommandPalette } from './CommandPalette.js';
import { SidebarResizer } from './SidebarResizer.js';
import { ContextMenuView, useContextMenu } from './ContextMenu.js';
import { buildCanvasMenuItems } from './canvas-menu.js';
import { moveEntry } from './entry-order.js';
import { duplicateEntry as duplicateEntryDoc } from '../editor/entry-duplicate.js';
import { getBuiltinTemplate } from '../templates/builtin-registry.js';

/** 三栏编辑器打样（m1.1）：可点击项=模板切换/缩放/面板折叠（边缘细轨展开）/主题（TitleBar） */
export function EditorMockup() {
  const { t } = useTranslation();
  const leftOpen = useMockup((s) => s.leftOpen);
  const rightOpen = useMockup((s) => s.rightOpen);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 命令注册（当前可用命令；后续模块随手挂：评估/走查/导出/设置…）
  useEffect(() => {
    const offs = [
      commandRegistry.register({
        id: 'view.back-library', title: '返回简历库', keywords: ['返回', '简历库'],
        run: () => window.dispatchEvent(new CustomEvent('fl:back-library')),
      }),
      commandRegistry.register({
        id: 'view.toggle-left', title: '收起/展开大纲', hint: '', keywords: ['大纲', '侧栏'],
        run: () => useMockup.getState().toggleLeft(),
      }),
      commandRegistry.register({
        id: 'view.toggle-right', title: '收起/展开评估面板', hint: '', keywords: ['评估', '侧栏'],
        run: () => useMockup.getState().toggleRight(),
      }),
      commandRegistry.register({
        id: 'file.save', title: '立即保存', hint: 'Ctrl+S', keywords: ['保存'],
        run: async () => {
          const r = await useEditorDoc.getState().saveNow();
          toast(r.ok ? t('titlebar.saved') : t('menu.saveFailed'));
        },
      }),
      commandRegistry.register({
        id: 'file.snapshot-create', title: '保存快照', keywords: ['快照', '版本'],
        run: async () => {
          await useEditorDoc.getState().createSnapshot();
          toast(t('snapshot.savedToast'));
        },
      }),
      commandRegistry.register({
        id: 'file.snapshot-restore', title: '回滚到快照…', keywords: ['快照', '回滚', '版本'],
        run: () => setSnapOpen(true),
      }),
      commandRegistry.register({
        id: 'structure.add-entry', title: t('menu.insertEntry'), keywords: ['条目', '新增', '经历', '项目'],
        run: () => {
          const ed = editorApiRef.current?.getEditor();
          if (!ed) return;
          const { $from } = ed.state.selection;
          for (let d = $from.depth; d > 0; d -= 1) {
            const node = $from.node(d);
            if (node.type.name !== 'flSection') continue;
            let count = 0;
            node.forEach((child) => {
              if (child.type.name === 'flEntry') count += 1;
            });
            ed.commands.insertEntry({ sectionId: String(node.attrs.id ?? ''), index: count });
            ed.commands.focus();
            return;
          }
        },
      }),
      commandRegistry.register({
        id: 'structure.delete-entry', title: t('menu.deleteEntry'), keywords: ['条目', '删除'],
        run: () => {
          const ed = editorApiRef.current?.getEditor();
          if (!ed) return;
          if (!ed.commands.deleteEntry()) return;
          toast(t('editor.entryDeleted'));
        },
      }),
      commandRegistry.register({
        id: 'file.clear-sample', title: t('menu.fileClear'), keywords: ['清空', '空白', '示例'],
        run: () => setClearConfirm(true),
      }),
      commandRegistry.register({
        id: 'structure.add-section', title: '新增分区…', keywords: ['分区', '标题', '经历', '自我评价', '证书'],
        run: () => setSectionDialogOpen(true),
      }),
      commandRegistry.register({
        id: 'structure.delete-section', title: '删除当前分区', keywords: ['分区', '删除'],
        run: () => runDeleteSection(),
      }),

      commandRegistry.register({
        id: 'edit.entry-duplicate', title: '复制当前要点', hint: 'Ctrl+D', keywords: ['复制', '要点', '块'],
        devOnly: false,
        run: () => {
          // #107：与 Ctrl+D 同语义（要点级）；光标不在要点上时退化为复制所属条目
          const api = editorApiRef.current;
          if (api?.duplicateActiveBullet()) return;
          const target = api?.getActiveEntry();
          if (target && target.sectionId && target.entryId) duplicateEntry(target.sectionId, target.entryId);
        },
      }),
      commandRegistry.register({
        id: 'edit.find', title: '在简历中查找', hint: 'Ctrl+F', keywords: ['查找', '搜索'],
        run: () => setSearchOpen(true),
      }),
      commandRegistry.register({
        id: 'dev.reload-packs', title: '[开发] 重载提示词包', devOnly: true,
        run: () => console.log('[m1.5] reload packs（M2 接管）'),
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);
  const editorApiRef = useRef<EditorApi | null>(null);
  const [snapOpen, setSnapOpen] = useState(false);
  // #121：新增分区对话框
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  /** #127：删除分区确认（取代原生 window.confirm） */
  const [sectionConfirm, setSectionConfirm] = useState<string | null>(null);
  /** #127：清空示例确认 */
  const [clearConfirm, setClearConfirm] = useState(false);
  // #126：内联搜索（本次接入；Ctrl+F 不再吞键）
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchState, setSearchState] = useState({ current: -1, total: 0 });

  /** 搜索状态同步：CanvasEditor 只回序号/总数，UI 自己维护显示 */
  const syncSearchState = () => {
    const api = editorApiRef.current;
    if (!api) return;
    const s = api.getSearchState();
    setSearchState({ current: s.current, total: s.total });
  };
  const handleSearchQuery = (query: string) => {
    editorApiRef.current?.find(query);
    syncSearchState();
  };
  const handleSearchNext = () => {
    editorApiRef.current?.findNext();
    syncSearchState();
  };
  const handleSearchPrev = () => {
    editorApiRef.current?.findPrev();
    syncSearchState();
  };
  const handleSearchClose = () => {
    editorApiRef.current?.clearFind();
    setSearchState({ current: -1, total: 0 });
    setSearchOpen(false);
  };

  // #124：命令栏（壳层）→ 编辑器动作总线。未注册时命令栏会 toast「编辑器未就绪」
  useEffect(() => {
    return registerEditorActions((id) => {
      const api = editorApiRef.current;
      switch (id) {
        case 'edit.undo':
          api?.undo();
          return !!api;
        case 'edit.redo':
          api?.redo();
          return !!api;
        case 'edit.cut':
          api?.cut();
          return !!api;
        case 'edit.copy':
          api?.copy();
          return !!api;
        case 'edit.paste':
          void api?.paste();
          return !!api;
        case 'edit.paste-plain':
          void api?.pastePlain();
          return !!api;
        case 'edit.select-all':
          api?.selectAll();
          return !!api;
        case 'edit.find':
          setSearchOpen(true);
          return true;
        case 'edit.duplicate-bullet': {
          if (api?.duplicateActiveBullet()) return true;
          const target = api?.getActiveEntry();
          if (target?.sectionId && target.entryId) duplicateEntry(target.sectionId, target.entryId);
          return !!api;
        }
        case 'edit.add-section':
          setSectionDialogOpen(true);
          return true;
        case 'edit.delete-section':
          runDeleteSection();
          return true;
        case 'file.snapshot-create':
          void useEditorDoc.getState().createSnapshot().then(() => toast(t('snapshot.savedToast')));
          return true;
        case 'file.snapshot-restore':
          setSnapOpen(true);
          return true;
        case 'file.clear-sample':
          setClearConfirm(true);
          return true;
        default:
          return false;
      }
    });
    // 依赖为空：handler 只读 ref，重挂无意义
  }, []);

  /** 光标所在分区的显示名（删除确认用；无光标分区时回退空） */
  const currentSectionName = (): string => {
    const editor = editorApiRef.current?.getEditor();
    if (!editor) return '';
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d -= 1) {
      const node = $from.node(d);
      if (node.type.name !== 'flSection') continue;
      const header = node.firstChild;
      return header?.textContent?.trim() || String(node.attrs.title ?? '');
    }
    return '';
  };

  /** 删除当前分区（命令面板/编辑菜单/命令栏共用；至少保留一个分区） */
  function runDeleteSection() {
    const editor = editorApiRef.current?.getEditor();
    if (!editor) return;
    if (!editor.can().deleteSection()) {
      toast(t('editor.sectionDeleteLast'));
      return;
    }
    const name = currentSectionName();
    // #127：改用应用内确认浮层，可撤销（Ctrl+Z）
    if (name) {
      setSectionConfirm(name);
      return;
    }
    editor.chain().focus().deleteSection().run();
  }

  const confirmDeleteSection = () => {
    editorApiRef.current?.getEditor()?.chain().focus().deleteSection().run();
    setSectionConfirm(null);
  };

  /** #127：清空示例为空白简历（先自动存快照，可回滚） */
  const clearToBlank = async () => {
    setClearConfirm(false);
    try {
      const st = useEditorDoc.getState();
      if (st.doc) await st.createSnapshot(t('editor.clearSnapshotLabel'));
      const result = await st.replaceDoc(
        createBlankDoc({ basicSection: t('editor.blankSectionTitle') }),
        t('editor.myResumeTitle'),
      );
      // #128：落盘失败不再谎报成功（replaceDoc 返回真实结果）
      if (!result.ok) {
        toast(t('editor.clearFailed'));
        return;
      }
      // #129：文档已清空但示例身份键删除失败 → 清空入口会复活，必须如实提示
      if (!result.sampleCleared) {
        toast(t('editor.clearPartial'));
        return;
      }
      toast(t('editor.clearedToast'));
    } catch (err) {
      console.error('[editor] clear to blank failed', err);
      toast(t('editor.clearFailed'));
    }
  };
  const canvasDoc = useEditorDoc((s) => s.doc);
  const isSample = useEditorDoc((s) => s.isSample);
  const applyDoc = useEditorDoc((s) => s.applyDoc);
  const loadError = useEditorDoc((s) => s.lastError);
  const activeResumeId = useEditorDoc((s) => s.resumeId);
  const leftWidth = useMockup((s) => s.leftWidth);
  const rightWidth = useMockup((s) => s.rightWidth);

  // #93：画布右键菜单（两种光标态）。结构复制真实现（同 entry 内复制条目，nanoid 新块）
  // 2026-11-04：按 manifest maxEntries 结构 gating（超限 toast，不复制）
  const duplicateEntry = (sectionId: string, entryId: string) => {
    const d = useEditorDoc.getState().doc;
    if (!d) return;
    const manifest = getBuiltinTemplate(d.templateId)?.manifest;
    const result = duplicateEntryDoc(d, manifest, sectionId, entryId);
    if (!result.ok) {
      toast(t('editor.structure.limitReached', { max: result.limit }));
      return;
    }
    if (result.doc !== d) useEditorDoc.getState().applyDoc(result.doc);
  };
  const reorderEntry = (sectionId: string, from: number, to: number) => {
    const d = useEditorDoc.getState().doc;
    if (!d) return;
    const sec = d.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const entries = moveEntry(sec.entries, from, to);
    if (entries === sec.entries) return; // 同位/越界：无需更新（#107）
    useEditorDoc.getState().applyDoc({
      ...d,
      sections: d.sections.map((s) => (s.id === sectionId ? { ...s, entries } : s)),
    });
  };

  // 命令事件：返回简历库
  useEffect(() => {
    const onBack = () => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '返回简历库'); b?.click(); };
    window.addEventListener('fl:back-library', onBack);
    return () => window.removeEventListener('fl:back-library', onBack);
  }, []);

  // #106：右键默认折叠选区 → 菜单拿不到选区态。document 捕获阶段拦住右键盘默认折叠（React 合成层不够早）
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.ProseMirror')) return;
      const s = window.getSelection();
      if (s && !s.isCollapsed && s.toString().trim().length > 0) e.preventDefault();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, []);

  // 全局快捷键（§5.6；编辑器内键位由 Tiptap 自理，此处管全局态）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // #127 守卫：输入框里或任何浮层打开时，全局快捷键不抢键（此前字段编辑框 Ctrl+D 会复制条目）
      const hasOverlay = !!document.querySelector('[data-overlay-open]');
      if (shouldIgnoreShortcut(e.target, hasOverlay)) return;
      const inEditor = !!document.activeElement?.closest('.ProseMirror');
      const hasSelection = inEditor && !window.getSelection()?.isCollapsed;
      const action = resolveShortcut(
        {
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          key: e.key,
          isComposing: e.isComposing,
          keyCode: e.keyCode,
        },
        { hasSelection, inEditor },
      );
      switch (action) {
        case 'command-palette':
          e.preventDefault();
          setPaletteOpen((o) => !o);
          break;
        case 'save':
          e.preventDefault();
          void useEditorDoc.getState().saveNow().then((r) => toast(r.ok ? t('titlebar.saved') : t('menu.saveFailed')));
          break;
        case 'insert-link':
          // #106/#127：选中文字按 Ctrl+Shift+K → 工具条进入链接编辑态（Ctrl+K 恒为命令面板）
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('fl:insert-link'));
          break;
        case 'duplicate-block': {
          // #107：Ctrl+D = 复制当前「要点」（块级语义，§5.6）；光标不在要点上则退化为复制所属条目
          e.preventDefault();
          const api = editorApiRef.current;
          if (api?.duplicateActiveBullet()) break;
          const target = api?.getActiveEntry();
          if (target && target.sectionId && target.entryId) duplicateEntry(target.sectionId, target.entryId);
          break;
        }
        case 'paste-plain': {
          // Ctrl+Shift+V 恒仅文本（§5.6）；仅编辑器内生效，输入框内交浏览器默认
          if (!inEditor) break;
          e.preventDefault();
          void editorApiRef.current?.pastePlain().catch(() => toast(t('editor.paste.failed')));
          break;
        }
        case 'find':
          // #126：Ctrl+F 打开内联搜索（此前只是吞键占位）
          e.preventDefault();
          setSearchOpen(true);
          break;
        case 'evaluate':
        case 'revise-block':
          e.preventDefault(); // M3/M4 真实现接管；先吞键防浏览器默认
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!canvasDoc) {
    // 不再留白（#109）：区分"仍在加载"与"加载失败"，后者给出可见错误与重试入口
    return (
      <div className="editor-mock" aria-busy="true" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          {loadError ? (
            <>
              <p className="muted">简历加载失败。错误信息：</p>
              <pre className="mono small" style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{loadError}</pre>
              <button
                className="m-btn primary"
                disabled={!activeResumeId}
                onClick={() => { if (activeResumeId) void useEditorDoc.getState().openResume(activeResumeId); }}
              >
                重试
              </button>
            </>
          ) : (
            <p className="muted">正在加载简历…</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="editor-mock">
      {leftOpen ? (
        <>
          <LeftPanel width={leftWidth}>
            <OutlineTreeLive doc={canvasDoc} onReorderEntry={reorderEntry} />
          </LeftPanel>
          <SidebarResizer side="left" />
        </>
      ) : (
        <Rail side="left" />
      )}
      <CenterPane canvasDoc={canvasDoc} onCanvasDocChange={applyDoc} editorApiRef={editorApiRef}
        onDuplicateEntry={duplicateEntry}
        banner={
          isSample ? (
            <div className="sample-pill">
              <span className="sample-pill-label">{t('editor.sampleBadge')}</span>
              <button
                type="button"
                className="sample-pill-clear"
                title={t('editor.sampleClearTitle')}
                onClick={() => setClearConfirm(true)}
              >
                {t('editor.sampleClear')}
              </button>
            </div>
          ) : null
        }
        search={
          <SearchBar
            open={searchOpen}
            current={searchState.current}
            total={searchState.total}
            onQuery={handleSearchQuery}
            onNext={handleSearchNext}
            onPrev={handleSearchPrev}
            onClose={handleSearchClose}
          />
        } />
      {rightOpen ? (
        <>
          <SidebarResizer side="right" />
          <RightPanel width={rightWidth}>
            <EvalPanel />
          </RightPanel>
        </>
      ) : (
        <Rail side="right" />
      )}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SnapshotDialog open={snapOpen} onClose={() => setSnapOpen(false)} />
      <ConfirmDialog
        open={sectionConfirm !== null}
        title={t('editor.sectionDeleteTitle')}
        body={t('editor.sectionDeleteConfirm', { name: sectionConfirm ?? '' })}
        confirmLabel={t('editor.sectionDeleteAction')}
        onConfirm={confirmDeleteSection}
        onClose={() => setSectionConfirm(null)}
      />
      <ConfirmDialog
        open={clearConfirm}
        title={t('editor.clearSampleTitle')}
        body={t('editor.clearSampleBody')}
        confirmLabel={t('editor.clearSample')}
        onConfirm={() => void clearToBlank()}
        onClose={() => setClearConfirm(false)}
      />
      {sectionDialogOpen && (
        <SectionDialog
          onSave={(draft) => {
            editorApiRef.current?.getEditor()?.chain().focus().insertSection(draft).run();
          }}
          onClose={() => setSectionDialogOpen(false)}
        />
      )}
    </div>
  );
}

/** 侧栏宽度容器（拖拽调宽；原 .m-left/.m-right 固定宽改由此注入） */
function LeftPanel({ width, children }: { width: number; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <aside className="m-left" style={{ width }} aria-label={t('editor.outline')}>
      {children}
    </aside>
  );
}
function RightPanel({ width, children }: { width: number; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <aside className="m-right m-eval" style={{ width }} aria-label={t('editor.evalPanel')}>
      {children}
    </aside>
  );
}

/** 折叠后的抽屉把手：小箭头（‹ / ›）拉开，边缘细轨存活于折叠容器之外 */
function Rail({ side }: { side: 'left' | 'right' }) {
  const { t } = useTranslation();
  const toggleLeft = useMockup((s) => s.toggleLeft);
  const toggleRight = useMockup((s) => s.toggleRight);
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  const label = side === 'left' ? t('editor.showOutline') : t('editor.showEval');
  return (
    <button
      className={`rail rail-${side}`}
      onClick={side === 'left' ? toggleLeft : toggleRight}
      aria-label={label}
      title={label}
    >
      <Icon size={15} strokeWidth={2.2} />
    </button>
  );
}

interface CenterPaneProps {
  canvasDoc: ResumeDoc;
  onCanvasDocChange: (d: ResumeDoc) => void;
  editorApiRef: React.MutableRefObject<EditorApi | null>;
  onDuplicateEntry: (sectionId: string, entryId: string) => void;
  /** #127：搜索条渲染在画布列内（.m-center），右栏打开时不再盖住评估面板 */
  search: React.ReactNode;
  /** #127：示例简历横幅（只在系统示例上显示） */
  banner?: React.ReactNode;
}
function CenterPane({ canvasDoc, onCanvasDocChange, editorApiRef, onDuplicateEntry, search, banner }: CenterPaneProps) {
  const { t } = useTranslation();
  const { zoomMode, zoom } = useMockup();
  const setCanvasDoc = onCanvasDocChange;
  const ctx = useContextMenu();

  // #93/#106 右键菜单：有选区=文字命令（剪切/复制/粘贴/全选）+ 条目副本；无选区=结构命令
  const openCanvasMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const hitEntryId = target.closest('[data-type="fl-entry"]')?.getAttribute('data-block-id') ?? undefined;
    const hitSectionId = target.closest('[data-type="fl-section"]')?.getAttribute('data-block-id') ?? '';
    const api = editorApiRef.current;
    const domSel = window.getSelection();
    const hasSelection = !!domSel && !domSel.isCollapsed && domSel.toString().trim().length > 0;
    // 选区起点在条目内时 PM 可给出精确条目；否则回落 DOM 命中（右键落点）
    const entry = api?.getActiveEntry() ?? (hitEntryId && hitSectionId ? { sectionId: hitSectionId, entryId: hitEntryId } : null);
    const items = buildCanvasMenuItems({
      hasSelection,
      entry: entry && entry.sectionId ? entry : null,
      t,
      actions: {
        cut: () => api?.cut(),
        copy: () => api?.copy(),
        paste: () => void api?.paste().catch(() => toast('粘贴失败：剪贴板不可读或格式不支持')),
        selectAll: () => api?.selectAll(),
        duplicate: (sectionId, entryId) => onDuplicateEntry(sectionId, entryId),
        deleteEntry: (entryId) => {
          if (api?.getEditor()?.commands.deleteEntry({ entryId })) toast(t('editor.entryDeleted'));
        },
      },
    });
    ctx.open(e.clientX, e.clientY, items);
  };
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [paperLayoutW, setPaperLayoutW] = useState(794);
  useEffect(() => {
    // 纸面布局宽只测一次（挂载后）：.paper-scale 为 fit-content 不随父宽拉伸，
    // 持续 Observer 会与 host 显式宽形成反馈环（实测滚到 22M px）——模板切换时由 key 重挂载自然重测
    const measure = () => {
      const scaled = hostRef.current?.querySelector('.paper-scale') as HTMLElement | null;
      if (scaled && scaled.offsetWidth > 0) {
        setPaperLayoutW(scaled.offsetWidth);
        return true;
      }
      return false;
    };
    if (measure()) return;
    const t = setTimeout(measure, 200);
    return () => clearTimeout(t);
  }, []);

  // #90-② fit 模式解析：容器/纸面变化时动态求倍率（fit-width 按可视宽；fit-page 按可视宽与高取小）
  useEffect(() => {
    if (zoomMode === 'fit-width' || zoomMode === 'fit-page') {
      const resolve = () => {
        const canvas = canvasRef.current;
        if (!canvas || paperLayoutW <= 0) return;
        const availW = canvas.clientWidth - 48; // 滚动垫
        let z = availW / paperLayoutW;
        if (zoomMode === 'fit-page') {
          const paper = hostRef.current?.querySelector('.fl-paper') as HTMLElement | null;
          const availH = canvas.clientHeight - 48;
          if (paper && paper.offsetHeight > 0) z = Math.min(z, availH / paper.offsetHeight);
        }
        useMockup.getState().setResolvedZoom(z);
      };
      resolve();
      const ro = new ResizeObserver(resolve); // 容器尺寸变化（窗口缩放/面板折叠）重解析
      if (canvasRef.current) ro.observe(canvasRef.current);
      return () => ro.disconnect();
    }
  }, [zoomMode, paperLayoutW]);

  // Ctrl+滚轮缩放（§5.2：步进 10%；任何滚轮/±操作离开 fit 模式进固定档）
  useEffect(() => {
    const onWheel: EventListener = (ev) => {
      const e = ev as WheelEvent;
      if (!e.ctrlKey) return;
      e.preventDefault();
      useMockup.getState().bumpZoom(e.deltaY < 0 ? 0.1 : -0.1);
    };
    const canvas = document.querySelector('.m-canvas');
    canvas?.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas?.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <section className="m-center">
      {banner}
      <div
        className="m-canvas"
        ref={canvasRef}
        onContextMenu={openCanvasMenu}
        // #106：右键默认折叠选区 → 菜单拿不到选区态。capture 阶段拦住右键盘的默认折叠，保留选区
        onMouseDownCapture={(e) => {
          if (e.button !== 2) return;
          const s = window.getSelection();
          if (s && !s.isCollapsed && s.toString().trim().length > 0) e.preventDefault();
        }}
      >
        {/*
          缩放滚动几何（§5.2）：transform 不改布局宽。外层显式布局宽=纸面宽×zoom 撑开滚动范围，
          内层 scale origin=top left 使滚动坐标与视觉一致。宽度随 Tiptap 挂载实测同步（ref 回读，
          勿硬编码——纸面真实宽由模板 margin/padding 决定）。左右留 scrollPad 让纸缘不贴死滚动边界。
        */}
        <div className="paper-host" style={{ width: paperLayoutW * zoom + 48 }} ref={hostRef}>
          <div className="paper-scale" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <CanvasEditor doc={canvasDoc} onDocChange={setCanvasDoc} onReady={(api) => { editorApiRef.current = api; }} />
          </div>
        </div>
      </div>
      <ContextMenuView state={ctx.state} onClose={ctx.close} />
      <ZoomCtl />
      {search}
    </section>
  );
}

/** #90-② 缩放控件：−[读数]+ 与 适应宽度/适应整页/实际尺寸 三选 */
function ZoomCtl() {
  const { t } = useTranslation();
  const zoom = useMockup((s) => s.zoom);
  const zoomMode = useMockup((s) => s.zoomMode);
  const setZoomMode = useMockup((s) => s.setZoomMode);
  const bump = useMockup((s) => s.bumpZoom);
  const label =
    zoomMode === 'fit-width' ? t('editor.zoomFitWidth') : zoomMode === 'fit-page' ? t('editor.zoomFitPage') : `${Math.round(zoom * 100)}%`;
  return (
    <div className="zoom-ctl">
      <button aria-label={t('editor.zoomOut')} onClick={() => bump(-0.1)}><Minus size={14} /></button>
      <button className="mode" aria-label={t('editor.zoomMode')} title={t('editor.zoomModeHint')} onClick={() => {
        // 循环：fit-width → fit-page → 100%（实际尺寸）→ fit-width
        setZoomMode(zoomMode === 'fit-width' ? 'fit-page' : zoomMode === 'fit-page' ? 1 : 'fit-width');
      }}>{label}</button>
      <button aria-label={t('editor.zoomIn')} onClick={() => bump(0.1)}><Plus size={14} /></button>
    </div>
  );
}

function EvalPanel() {
  const { t } = useTranslation();
  const toggleRight = useMockup((s) => s.toggleRight);
  return (
    <div className="m-eval-body">
      <button className="m-btn" onClick={toggleRight} style={{ padding: '4px 10px', marginBottom: 8 }} aria-label={t('editor.hideEval')}>
        <PanelRightClose size={14} />{t('editor.collapse')}
      </button>
      <h2>{t('editor.evalReport')}</h2>
      {/* #127 去假象：不再展示硬编码分数/模型/批注（会误导成真实评估结果） */}
      <div className="eval-empty">
        <p className="muted">{t('editor.evalUnavailable')}</p>
      </div>
    </div>
  );
}
