import {
  ChevronDown, ChevronLeft, ChevronRight, FileText, GripVertical, Minus, PanelLeftClose,
  PanelRightClose, Plus, Redo2, ScanSearch, Sparkles, Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useMockup } from '../../stores/mockup.js';
import { CanvasEditor } from '../editor/CanvasEditor.js';
import { sampleDoc } from './sample-data.js';
import { dims, findings } from './sample-data.js';

/** 三栏编辑器打样（m1.1）：可点击项=模板切换/缩放/面板折叠（边缘细轨展开）/主题（TitleBar） */
export function EditorMockup() {
  const leftOpen = useMockup((s) => s.leftOpen);
  const rightOpen = useMockup((s) => s.rightOpen);
  return (
    <div className="editor-mock">
      {leftOpen ? <OutlineTree /> : <Rail side="left" />}
      <CenterPane />
      {rightOpen ? <EvalPanel /> : <Rail side="right" />}
    </div>
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

function CenterPane() {
  const { t } = useTranslation();
  const { template, zoomMode, zoom, setTemplate } = useMockup();
  const [canvasDoc, setCanvasDoc] = useState(sampleDoc);
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
        <button className="m-btn" disabled title={t('editor.mockOnly')}><Undo2 size={14} /></button>
        <button className="m-btn" disabled title={t('editor.mockOnly')}><Redo2 size={14} /></button>
        <button className="m-btn" title={t('editor.mockOnly')}><ScanSearch size={14} />{t('editor.walkthrough')}</button>
        <button className="m-btn primary" title={t('editor.mockOnly')}><Sparkles size={14} />{t('editor.evaluate')}</button>
      </div>
      <div className="m-canvas" ref={canvasRef}>
        {/*
          缩放滚动几何（§5.2）：transform 不改布局宽。外层显式布局宽=纸面宽×zoom 撑开滚动范围，
          内层 scale origin=top left 使滚动坐标与视觉一致。宽度随 Tiptap 挂载实测同步（ref 回读，
          勿硬编码——纸面真实宽由模板 margin/padding 决定）。左右留 scrollPad 让纸缘不贴死滚动边界。
        */}
        <div className="paper-host" style={{ width: paperLayoutW * zoom + 48 }} ref={hostRef}>
          <div className="paper-scale" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <CanvasEditor doc={canvasDoc} onDocChange={setCanvasDoc} />
          </div>
        </div>
        <div className="pagebreak mono">{t('editor.pagebreak')}</div>
      </div>
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

function OutlineTree() {
  const { t } = useTranslation();
  const toggleLeft = useMockup((s) => s.toggleLeft);
  return (
    <aside className="m-left" aria-label={t('editor.outline')}>
      <button className="m-btn" onClick={toggleLeft} style={{ margin: '0 4px 10px', padding: '4px 10px' }} aria-label={t('editor.hideOutline')}>
        <PanelLeftClose size={14} />{t('editor.collapse')}
      </button>
      <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'var(--ade-muted)', margin: '2px 4px 8px' }}>{t('editor.outline')}</h2>
      <div className="tree-item"><ChevronDown size={14} />{t('paper.basic')}</div>
      <div className="tree-item"><ChevronDown size={14} />{t('paper.edu')}</div>
      <div className="tree-item sub">华中科技大学</div>
      <div className="tree-item"><ChevronDown size={14} />{t('paper.exp')}</div>
      <div className="tree-item sub active"><GripVertical size={12} />字节跳动 · 产品实习</div>
      <div className="tree-item sub"><GripVertical size={12} />美团 · 产品运营实习</div>
      <div className="tree-item"><ChevronDown size={14} />{t('paper.proj')}</div>
      <div className="tree-item sub">书循环 · 联合创始人</div>
      <div className="tree-item"><ChevronDown size={14} />{t('paper.skills')}</div>
      <p className="tpl-note">
        {t('editor.currentTemplate')}：<b>{t(useMockup.getState().template === 'duo' ? 'editor.tplDuo' : 'editor.tplClassic')}</b>
        <br />{t('editor.tplNote')}
      </p>
    </aside>
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
