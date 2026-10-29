import {
  ChevronLeft, ChevronRight, FileText, Minus, PanelRightClose, Plus, Redo2, ScanSearch, Sparkles, Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import type { ResumeDoc } from '@fairlens/shared';
import { useMockup } from '../../stores/mockup.js';
import { useEditorDoc } from '../../stores/editor-doc.js';
import { CanvasEditor, type EditorApi } from '../editor/CanvasEditor.js';
import { SnapshotDialog } from './SnapshotDialog.js';
import { toast } from '../../app/Toast.js';
import { nanoid } from '../../lib/nanoid.js';
import { resolveShortcut } from '../editor/shortcuts.js';
import { commandRegistry } from '../editor/command-registry.js';
import { OutlineTreeLive } from './OutlineTreeLive.js';
import { CommandPalette } from './CommandPalette.js';
import { SidebarResizer } from './SidebarResizer.js';
import { ContextMenuView, useContextMenu } from './ContextMenu.js';
import { buildCanvasMenuItems } from './canvas-menu.js';
import { dims, findings } from './sample-data.js';

/** 三栏编辑器打样（m1.1）：可点击项=模板切换/缩放/面板折叠（边缘细轨展开）/主题（TitleBar） */
export function EditorMockup() {
  const leftOpen = useMockup((s) => s.leftOpen);
  const rightOpen = useMockup((s) => s.rightOpen);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 命令注册（当前可用命令；后续模块随手挂：评估/走查/导出/设置…）
  useEffect(() => {
    const offs = [
      commandRegistry.register({
        id: 'view.back-library', title: '返回简历库', hint: 'Ctrl+Alt+←', keywords: ['返回', '简历库'],
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
          await useEditorDoc.getState().saveNow();
          toast('已保存');
        },
      }),
      commandRegistry.register({
        id: 'file.snapshot-create', title: '保存快照', keywords: ['快照', '版本'],
        run: async () => {
          await useEditorDoc.getState().createSnapshot();
          toast('快照已保存');
        },
      }),
      commandRegistry.register({
        id: 'file.snapshot-restore', title: '回滚到快照…', keywords: ['快照', '回滚', '版本'],
        run: () => setSnapOpen(true),
      }),



      commandRegistry.register({
        id: 'edit.entry-duplicate', title: '复制当前条目', hint: 'Ctrl+D', keywords: ['复制', '条目'],
        devOnly: false, run: () => console.log('[m1.5] 复制条目请用画布右键菜单（需先选中条目）'),
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
  const canvasDoc = useEditorDoc((s) => s.doc);
  const applyDoc = useEditorDoc((s) => s.applyDoc);
  const leftWidth = useMockup((s) => s.leftWidth);
  const rightWidth = useMockup((s) => s.rightWidth);

  // #93：画布右键菜单（两种光标态）。结构复制真实现（同 entry 内复制条目，nanoid 新块）
  const duplicateEntry = (sectionId: string, entryId: string) => {
    const d = useEditorDoc.getState().doc;
    if (!d) return;
    useEditorDoc.getState().applyDoc({
      ...d,
      sections: d.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const idx = sec.entries.findIndex((e) => e.id === entryId);
        if (idx === -1) return sec;
        const src = sec.entries[idx]!;
        const copy = {
          ...src,
          id: nanoid(),
          bullets: src.bullets.map((b) => ({ ...b, id: nanoid() })),
        };
        const entries = [...sec.entries];
        entries.splice(idx + 1, 0, copy);
        return { ...sec, entries };
      }),
    });
  };
  const reorderEntry = (sectionId: string, from: number, to: number) => {
    const d = useEditorDoc.getState().doc;
    if (!d) return;
    useEditorDoc.getState().applyDoc({
      ...d,
      sections: d.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, entries: sec.entries.map((e, i, arr) => (i === from ? arr[to]! : i === to ? arr[from]! : e)) }
          : sec,
      ),
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

  // 全局快捷键（§5.10；编辑器内键位由 Tiptap 自理，此处管全局态）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inEditor = !!document.activeElement?.closest('.ProseMirror');
      const hasSelection = inEditor && !window.getSelection()?.isCollapsed;
      const action = resolveShortcut(
        { ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, key: e.key },
        { hasSelection, inEditor },
      );
      switch (action) {
        case 'command-palette':
          e.preventDefault();
          setPaletteOpen((o) => !o);
          break;
        case 'save':
          e.preventDefault();
          void useEditorDoc.getState().saveNow().then(() => toast('已保存'));
          break;
        case 'insert-link':
          // #106：选中文字按 Ctrl+K → 工具条进入链接编辑态（此前 resolveShortcut 有路由但无人消费）
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('fl:insert-link'));
          break;
        case 'duplicate-block': {
          // #106：Ctrl+D 复制当前条目（此前无消费方，会触发浏览器"添加书签"）
          e.preventDefault();
          const target = editorApiRef.current?.getActiveEntry();
          if (target && target.sectionId && target.entryId) duplicateEntry(target.sectionId, target.entryId);
          break;
        }
        case 'evaluate':
        case 'revise-block':
        case 'find':
          e.preventDefault(); // M3/M4 真实现接管；先吞键防浏览器默认（Ctrl+F 搜索栏）
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!canvasDoc) {
    return <div className="editor-mock" aria-busy="true" />; // openCurrent 异步就绪前的空帧
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
        onDuplicateEntry={duplicateEntry} />
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
    </div>
  );
}

/** 侧栏宽度容器（拖拽调宽；原 .m-left/.m-right 固定宽改由此注入） */
function LeftPanel({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <aside className="m-left" style={{ width }} aria-label="大纲">
      {children}
    </aside>
  );
}
function RightPanel({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <aside className="m-right m-eval" style={{ width }} aria-label="评估报告">
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
}
function CenterPane({ canvasDoc, onCanvasDocChange, editorApiRef, onDuplicateEntry }: CenterPaneProps) {
  const { t } = useTranslation();
  const { template, zoomMode, zoom, setTemplate } = useMockup();
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
      actions: {
        cut: () => api?.cut(),
        copy: () => api?.copy(),
        paste: () => void api?.paste().catch(() => toast('粘贴失败：剪贴板不可读或格式不支持')),
        selectAll: () => api?.selectAll(),
        duplicate: (sectionId, entryId) => onDuplicateEntry(sectionId, entryId),
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
      <div className="m-toolbar">
        <div className="seg" role="group" aria-label={t('editor.template')}>
          <button aria-pressed={template === 'classic'} onClick={() => setTemplate('classic')}>{t('editor.tplClassic')}</button>
          <button aria-pressed={template === 'duo'} onClick={() => setTemplate('duo')}>{t('editor.tplDuo')}</button>
        </div>
        <span style={{ flex: 1 }} />
        <button className="m-btn" title={t('editor.mockOnly')} onClick={() => editorApiRef.current?.undo()}><Undo2 size={14} /></button>
        <button className="m-btn" title={t('editor.mockOnly')} onClick={() => editorApiRef.current?.redo()}><Redo2 size={14} /></button>
        <button className="m-btn" title={t('editor.mockOnly')}><ScanSearch size={14} />{t('editor.walkthrough')}</button>
        <button className="m-btn primary" title={t('editor.mockOnly')}><Sparkles size={14} />{t('editor.evaluate')}</button>
      </div>
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
        <div className="pagebreak mono">{t('editor.pagebreak')}</div>
      </div>
      <ContextMenuView state={ctx.state} onClose={ctx.close} />
      <ZoomCtl />
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
    <aside className="m-right m-eval" aria-label={t('editor.evalPanel')}>
      <button className="m-btn" onClick={toggleRight} style={{ padding: '4px 10px', marginBottom: 8 }} aria-label={t('editor.hideEval')}>
        <PanelRightClose size={14} />{t('editor.collapse')}
      </button>
      <h2>{t('editor.evalReport')}</h2>
      <p className="meta mono">10-24 14:02 · glm-4.7 · general v4</p>
      <div className="score-row">
        <span className="big">62</span><span className="lvl">{t('editor.levelMid')}</span><span className="delta">+4</span>
      </div>
      <p className="summary-serif">
        {t('editor.summaryLead')}<b>{t('editor.summaryA')}</b>{t('editor.summaryAnd')}<b>{t('editor.summaryB')}</b>{t('editor.summaryTail')}
      </p>
      <Radar />
      <table className="dims-tb">
        <tbody>
          {dims.map((d) => (
            <tr key={d.name}>
              <td className="dnm">{d.name}</td>
              <td className="trk"><i style={{ ['--w' as string]: `${d.score}%` }} /></td>
              <td className="num">{d.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="m-findings">
        <h3>{t('editor.findings', { count: findings.length })}</h3>
        {findings.map((f) => (
          <div className="finding" key={f.target} role="button" tabIndex={0}>
            <span className={`sev ${f.sev}`} />
            <p>{f.title}<span>{f.sub}</span></p>
          </div>
        ))}
      </div>
      <button className="cta">{t('editor.goFix')}<FileText size={14} /></button>
    </aside>
  );
}

/** 雷达（打样静态值；真实=评估管道产出） */
function Radar() {
  const labels = [
    { t: '结构 72', x: 90, y: 20 }, { t: 'STAR 61', x: 146, y: 58 }, { t: '量化 48', x: 146, y: 132 },
    { t: '匹配 55', x: 90, y: 166 }, { t: '关键词 66', x: 4, y: 132 }, { t: '清晰 78', x: 10, y: 58 },
  ];
  const grid = (r: number) =>
    `90,${90 - r} ${90 + r * 0.866},${90 - r * 0.5} ${90 + r * 0.866},${90 + r * 0.5} 90,${90 + r} ${90 - r * 0.866},${90 + r * 0.5} ${90 - r * 0.866},${90 - r * 0.5}`;
  const poly = '90,48.2 120.6,72.3 114.1,103.9 90,121.9 56.9,109.1 50.8,67.4';
  const accent = 'var(--ade-accent)';
  return (
    <svg width="196" height="176" viewBox="0 0 180 176" role="img" aria-label="六维雷达" style={{ margin: '2px auto 4px' }}>
      <polygon points={grid(29)} fill="none" stroke="var(--ade-line)" />
      <polygon points={grid(58)} fill="none" stroke="var(--ade-line)" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const rad = (a * Math.PI) / 180;
        return <line key={a} x1="90" y1="90" x2={90 + 58 * Math.sin(rad)} y2={90 - 58 * Math.cos(rad)} stroke="var(--ade-line)" />;
      })}
      <polygon points={poly} fill="var(--ade-accent-soft)" stroke={accent} strokeWidth="1.6" />
      {[['90', '48.2'], ['120.6', '72.3'], ['114.1', '103.9'], ['90', '121.9'], ['56.9', '109.1'], ['50.8', '67.4']].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r="2.4" fill={accent} />
      ))}
      {labels.map((l) => (
        <text key={l.t} x={l.x} y={l.y} textAnchor={l.x === 90 ? 'middle' : l.x > 90 ? 'start' : 'end'} fontSize="10.5" fill="var(--ade-muted)">{l.t}</text>
      ))}
    </svg>
  );
}
