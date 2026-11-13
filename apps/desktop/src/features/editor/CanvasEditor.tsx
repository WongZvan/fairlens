/**
 * 画布编辑器（m1.4）：真 Tiptap 替换打样静态纸面。
 * 职责：模板 printCSS 注入（编辑样式=导出样式）+ 样式选项三维令牌应用 +
 * 分页参考线（CSS 近似）+ 权限矩阵 gating + 粘贴归一化四项（docs/01 §5.2/5.6/§8）。
 * 契约源=packages/shared/src/{resume,template}.ts。
 */
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { FloatingToolbar } from './FloatingToolbar.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocStyle, ResumeDoc } from '@fairlens/shared';
import { validateDocStyleAgainstManifest } from '@fairlens/shared';
import { flExtensions, pmToResumeDoc, resumeDocToPm } from './nodes.js';
import { pickAppendTarget } from './blank-click.js';
import { TextSelection } from '@tiptap/pm/state';
import { searchPluginKey, computeSearchState, SearchHighlight } from './search-plugin.js';
import { nextIndex, prevIndex } from './search.js';

/** #126：选中一个匹配（只改 selection，不动文档；不产生撤销步） */
function selectMatch(view: EditorView, match: { from: number; to: number }) {
  const { state } = view;
  const tr = state.tr.setSelection(TextSelection.create(state.doc, match.from, match.to)).scrollIntoView();
  view.dispatch(tr);
}

/** #126：在匹配间循环跳转；返回 1-based 序号（0=无匹配） */
function stepMatch(editor: Editor, delta: 1 | -1): number {
  const pluginState = searchPluginKey.getState(editor.state);
  if (!pluginState || pluginState.matches.length === 0) return 0;
  const current =
    delta > 0 ? nextIndex(pluginState.current, pluginState.matches.length) : prevIndex(pluginState.current, pluginState.matches.length);
  const next = { ...pluginState, current };
  const match = pluginState.matches[current]!;
  const tr = editor.state.tr.setMeta(searchPluginKey, next).setSelection(TextSelection.create(editor.state.doc, match.from, match.to)).scrollIntoView();
  editor.view.dispatch(tr);
  return current + 1;
}
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import {
  buildPastePlan,
  insertPastePlan,
  makePasteHandler,
  readClipboardPayload,
  type PasteInsertion,
  type PastePlan,
} from './use-paste-normalization.js';
import { PasteBubble, type PasteBubbleState } from './PasteBubble.js';
import { toast } from '../../app/Toast.js';
import { resolveStyleVars } from './style-vars.js';
import { getBuiltinTemplate } from '../templates/builtin-registry.js';
import { nanoid } from '../../lib/nanoid.js';

export interface EditorApi {
  undo: () => void;
  redo: () => void;
  /** 复制选区（focus + 原生 copy，经 ProseMirror 序列化=保留节点结构） */
  copy: () => void;
  /** 剪切选区（同上，cut 事件由 PM 处理） */
  cut: () => void;
  /** 粘贴系统剪贴板：text/html 走 schema 白名单解析；仅纯文本走文本插入 */
  paste: () => Promise<void>;
  /** Ctrl+Shift+V：恒仅文本粘贴（读剪贴板后走同一归一化管线，不弹气泡） */
  pastePlain: () => Promise<void>;
  selectAll: () => void;
  /** 光标所在条目（右键菜单/ Ctrl+D 复制条目定位用） */
  getActiveEntry: () => { sectionId: string; entryId: string } | null;
  /** 复制光标所在「要点」（Ctrl+D 的块级语义，§5.6；返回 false=光标不在要点上） */
  duplicateActiveBullet: () => boolean;
  /** 派发空事务：让依赖事务的 UI（悬浮工具条 shouldShow/定位）重新求值 */
  refresh: () => void;
  /** 底层 editor 实例（命令面板里的结构命令需要 can()/chain()；勿用它做绕过 schema 的写入） */
  getEditor: () => Editor | null;
  /** #126：设置搜索词（空串=清除高亮）；返回匹配数 */
  find: (query: string) => number;
  /** #126：跳到下一条/上一条匹配（循环）；返回当前序号（1-based，无匹配=0） */
  findNext: () => number;
  findPrev: () => number;
  /** #126：清除高亮（关闭搜索条时调） */
  clearFind: () => void;
  /** #126：当前搜索状态（计数/当前序号） */
  getSearchState: () => { current: number; total: number };
}

export interface CanvasEditorProps {
  doc: ResumeDoc;
  onDocChange: (doc: ResumeDoc) => void;
  /** 编辑器就绪后暴露 undo/redo（工具栏按钮/快捷键消费） */
  onReady?: (api: EditorApi) => void;
  /** 只读渲染（快照对比双栏用，m1.6） */
  readOnly?: boolean;
}

export function CanvasEditor({ doc, onDocChange, onReady, readOnly }: CanvasEditorProps) {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const builtin = getBuiltinTemplate(doc.templateId);
  const manifest = builtin?.manifest;

  // 样式三维：越界值回落（validateDocStyleAgainstManifest，切模板场景）
  const effectiveStyle: DocStyle = useMemo(() => {
    const check = manifest ? validateDocStyleAgainstManifest(manifest, doc.style) : { ok: true } as const;
    if (check.ok) return doc.style ?? {};
    return {}; // 越界整体回落默认（toast 提示由调用方在切换时做）
  }, [manifest, doc.style]);

  const [pasteBubble, setPasteBubble] = useState<PasteBubbleState | null>(null);
  const pasteSessionRef = useRef<{ from: number; to: number; plainText: string } | null>(null);
  const bubbleOpenRef = useRef(false);

  const closeBubble = useCallback(() => {
    pasteSessionRef.current = null;
    bubbleOpenRef.current = false;
    setPasteBubble(null);
  }, []);

  /** 插入后的统一反馈：图片 toast / 大段提示 / 保留格式气泡（仅 html 模式） */
  const showPasteResult = useCallback((view: EditorView, plan: PastePlan, insertion: PasteInsertion) => {
    if (plan.ignoredImageCount > 0) {
      toast(tRef.current('editor.paste.imagesIgnored', { count: plan.ignoredImageCount }));
    }
    // 长文提示与插入区间无关：块级粘贴区间算不出时也必须提示（2026-11-13 反馈修复：
    // 原实现把它放在区间判空之后，html 粘贴被一起吞掉）
    if (plan.wasLargePaste) toast(tRef.current('editor.paste.large'));
    if (plan.mode !== 'html') return;
    if (insertion.to <= insertion.from) return;
    const coords = view.coordsAtPos(insertion.from);
    pasteSessionRef.current = { from: insertion.from, to: insertion.to, plainText: plan.plainText };
    bubbleOpenRef.current = true;
    setPasteBubble({
      anchor: { left: coords.left, top: coords.top, bottom: coords.bottom },
      large: plan.wasLargePaste,
      plainAvailable: plan.plainText.length > 0,
    });
  }, []);

  // useEditor 只在创建时消费 handlePaste：依赖保持稳定，闭包内动态值走 ref/useCallback
  const handlePaste = useMemo(
    () => makePasteHandler((plan, insertion, view) => showPasteResult(view, plan, insertion)),
    [showPasteResult],
  );

  const editor = useEditor({
    extensions: [
      // 精确白名单（§5.2）：弃用 StarterKit——其内部扩展（listKeymap 等）在关闭 list 节点时仍引用
      // listItem 导致 schema 崩溃，且 v3 内置 link 与显式 Link 重复注册
      Document, Text, Paragraph, Bold, Italic, History,
      ...flExtensions,
      SearchHighlight, // #126：内联搜索高亮（装饰层，不入历史）

      Placeholder.configure({ placeholder: '写下这条经历…' }),
    ],
    content: resumeDocToPm(doc),
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'fl-paper' },
      handlePaste,
      // 版式保护（#107）：禁止把选中文字拖走改版式——换序统一走左侧大纲拖拽
      handleDOMEvents: {
        dragstart: (_view, event) => {
          event.preventDefault();
          return true;
        },
      },
    },
    onUpdate: ({ editor }) => {
      const next = pmToResumeDoc(editor.getJSON(), { templateId: doc.templateId, style: doc.style });
      lastEmitted.current = next;
      onDocChange(next);
    },
  }, [doc.templateId, readOnly]);

  // 外部 doc 注入同步（m1.6 快照回滚是首个外部注入场景）：编辑器自身回流引用相等不写回，
  // 仅真正的外部变更（回滚/库切换）重置内容——emitUpdate:false 防二次落盘与光标打断
  const lastEmitted = useRef(doc);
  const lastTemplateId = useRef(doc.templateId);
  useEffect(() => {
    if (doc.templateId !== lastTemplateId.current) {
      // 模板重建路径：useEditor 已按新 doc 初始化内容
      lastTemplateId.current = doc.templateId;
      lastEmitted.current = doc;
      return;
    }
    if (doc === lastEmitted.current) return;
    lastEmitted.current = doc;
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(resumeDocToPm(doc), { emitUpdate: false });
    }
  }, [doc, editor]);

  // 模板 CSS 注入（编辑样式=导出样式：同一 printCSS 进 <style>）
  const templateCss = builtin?.printCss ?? '';
  const styleVars = resolveStyleVars(manifest, effectiveStyle);
  useEffect(() => {
    if (!editor || !onReady) return;
    const findEntry = () => {
      const { $from } = editor.state.selection;
      for (let d = $from.depth; d > 0; d -= 1) {
        const node = $from.node(d);
        if (node.type.name === 'flEntry') {
          const section = d > 1 ? $from.node(d - 1) : null;
          return { sectionId: String(section?.attrs.id ?? ''), entryId: String(node.attrs.id ?? '') };
        }
      }
      return null;
    };
    const pastePlan = async (plainOnly: boolean) => {
      editor.chain().focus().run();
      const payload = await readClipboardPayload();
      const plan = buildPastePlan(payload, { plainOnly });
      if (!plan) return;
      const insertion = insertPastePlan(editor.view, plan);
      showPasteResult(editor.view, plan, insertion);
    };
    onReady({
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      copy: () => {
        editor.chain().focus().run();
        document.execCommand('copy');
      },
      cut: () => {
        editor.chain().focus().run();
        document.execCommand('cut');
      },
      paste: () => pastePlan(false),
      pastePlain: () => pastePlan(true),
      selectAll: () => editor.chain().focus().selectAll().run(),
      getActiveEntry: findEntry,
      duplicateActiveBullet: () => {
        const { $from } = editor.state.selection;
        for (let d = $from.depth; d > 0; d -= 1) {
          const node = $from.node(d);
          if (node.type.name !== 'flBullet') continue;
          const pos = $from.after(d);
          // 同一 bullet 节点复制一份（nanoid 新 id，runs 原样）——走 PM 事务，保留撤销栈
          const clone = node.type.create({ ...node.attrs, id: nanoid() }, node.content, node.marks);
          editor.chain().focus().insertContentAt(pos, clone.toJSON()).run();
          return true;
        }
        return false;
      },
      refresh: () => editor.view.dispatch(editor.state.tr),
      getEditor: () => editor,
      // #126 内联搜索：装饰与选中都走 PM 事务；搜索本身 addToHistory:false，不污染撤销栈
      find: (query) => {
        const state = computeSearchState(editor.state.doc, query, 0);
        editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, state));
        if (state.matches.length > 0) selectMatch(editor.view, state.matches[0]!);
        return state.matches.length;
      },
      findNext: () => stepMatch(editor, 1),
      findPrev: () => stepMatch(editor, -1),
      clearFind: () => {
        editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, { query: '', matches: [], current: -1 }));
      },
      getSearchState: () => {
        const s = searchPluginKey.getState(editor.state);
        return { current: s?.current ?? -1, total: s?.matches.length ?? 0 };
      },
    });
  }, [editor, onReady, showPasteResult]);

  /** 「仅文本」：把刚插入的区间原地替换为无 mark 的纯文本（保留格式气泡的第二个选项） */
  const choosePlain = useCallback(() => {
    const session = pasteSessionRef.current;
    if (!editor || editor.isDestroyed || !session) {
      closeBubble();
      return;
    }
    try {
      const { schema } = editor.state;
      const inline: PMNode[] = [];
      session.plainText.split('\n').forEach((line, i) => {
        if (i > 0) inline.push(schema.nodes.hardBreak!.create());
        if (line.length > 0) inline.push(schema.text(line));
      });
      // 粘贴可能是多块（已转成多条 bullet）：此时区间跨块，必须用整条 bullet 承载纯文本，
      // 否则把 inline 节点塞进 doc 层会 fitting 失败。同一要点内则保持内联替换。
      const $from = editor.state.doc.resolve(session.from);
      const $to = editor.state.doc.resolve(session.to);
      const sameTextblock = $from.parent === $to.parent && $from.parent.isTextblock;
      const replacement: PMNode | PMNode[] = sameTextblock
        ? inline
        : schema.nodes.flBullet!.create({ id: nanoid() }, inline);
      const tr = editor.state.tr.replaceWith(session.from, session.to, replacement);
      tr.setStoredMarks([]); // 纯文本不得继承当前加粗/斜体/链接 mark
      editor.view.dispatch(tr);
      editor.commands.focus();
    } finally {
      closeBubble();
    }
  }, [editor, closeBubble]);

  // 粘贴后用户继续编辑（docChanged）→ 关闭气泡并保留保留格式版本，位置不再可信
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      if (bubbleOpenRef.current) closeBubble();
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, closeBubble]);

  /**
   * #114 点纸面空白新增要点：条目下方空白 / 纸面底部空白 → 在该条目末尾追加一条要点。
   * 点文字（要点/标题/链接）不拦截，交给编辑器默认光标。
   */
  const appendBulletToEntry = (entryId: string) => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.command(({ tr, state }) => {
      let target = -1;
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'flEntry' && String(node.attrs.id) === entryId) target = pos + node.nodeSize - 1;
      });
      if (target < 0) return false;
      const bulletType = state.schema.nodes.flBullet;
      if (!bulletType) return false;
      const bullet = bulletType.create({ id: nanoid() });
      tr.insert(target, bullet);
      tr.setSelection(TextSelection.near(tr.doc.resolve(target + 1)));
      return true;
    });
    editor.commands.focus();
  };

  const onPaperMouseDownCapture = (e: React.MouseEvent) => {
    if (readOnly || !editor || editor.isDestroyed) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    // 「点文字」白名单：所有承载可编辑内容/可点击元素的容器都算文字。
    // 2026-11-13 修复：原清单只列 bullet/条目头/分区标题，漏了页头、基本信息字段、技能组
    // 以及任何裸段落（粘贴产生）——点它们会被当成空白，于是在别处插新要点。
    const onText = !!target.closest(
      [
        'li[data-type="fl-bullet"]',
        '[data-type="fl-entry-header"]',
        '[data-type="fl-section-header"]',
        '[data-type="fl-page-header"]',
        '[data-type="fl-basic-field"]',
        '[data-type="fl-skill-group"]',
        '[data-type="fl-photo-slot"]',
        'p',
        'a',
      ].join(', '),
    );
    const entryEl = target.closest('article[data-type="fl-entry"]') as HTMLElement | null;
    const sectionEl = target.closest('section[data-type="fl-section"]') as HTMLElement | null;
    const paper = editor.view.dom;

    const lastBulletBottom = (entry: HTMLElement) => {
      const bullets = entry.querySelectorAll('li[data-type="fl-bullet"]');
      const last = bullets[bullets.length - 1] as HTMLElement | undefined;
      return (last ?? entry).getBoundingClientRect().bottom;
    };
    const boxOf = (el: HTMLElement) => {
      const id = el.getAttribute('data-block-id');
      return id ? { entryId: id, lastBulletBottom: lastBulletBottom(el) } : null;
    };

    const hitEntry = entryEl ? boxOf(entryEl) : null;
    // 分区空白（条目之间/分区内边距）：取点击位置上方最近的条目
    let aboveEntryInSection: { entryId: string; lastBulletBottom: number } | null = null;
    if (sectionEl && !entryEl) {
      const entries = Array.from(sectionEl.querySelectorAll('article[data-type="fl-entry"]')) as HTMLElement[];
      const above = entries.filter((el) => el.getBoundingClientRect().top <= e.clientY).pop();
      if (above) aboveEntryInSection = boxOf(above);
    }
    // 纸面底部空白：文档最后一个条目
    const allSections = Array.from(paper.querySelectorAll('section[data-type="fl-section"]')) as HTMLElement[];
    const lastSection = allSections[allSections.length - 1];
    const lastEntries = lastSection ? (Array.from(lastSection.querySelectorAll('article[data-type="fl-entry"]')) as HTMLElement[]) : [];
    const lastEntryEl = lastEntries[lastEntries.length - 1] ?? null;
    const lastEntryInDoc = lastEntryEl && !entryEl && !sectionEl
      ? (() => {
          const id = lastEntryEl.getAttribute('data-block-id');
          return id ? { entryId: id, lastEntryBottom: lastBulletBottom(lastEntryEl) } : null;
        })()
      : null;

    const entryId = pickAppendTarget({ onText, hitEntry, aboveEntryInSection, lastEntryInDoc, clickY: e.clientY });
    if (!entryId) return;
    e.preventDefault();
    appendBulletToEntry(entryId);
  };

  return (
    <div className="canvas-wrap">
      <style>{templateCss}</style>
      <div className="fl-host" style={styleVars as React.CSSProperties} data-template={doc.templateId} onMouseDownCapture={onPaperMouseDownCapture}>
        <EditorContent editor={editor} />
        <FloatingToolbar editor={editor} readOnly={readOnly} />
      </div>
      <PageGuides />
      <PasteBubble state={pasteBubble} onKeep={closeBubble} onPlain={choosePlain} />
    </div>
  );
}

/** A4 分页参考线（CSS 近似；精确分页以导出为准——docs/01 §5.2 注记） */
function PageGuides() {
  return (
    <div className="page-guides" aria-hidden="true">
      <div className="page-guide" style={{ top: 297 * (96 / 25.4) * (2 / 3) }} />
    </div>
  );
}
