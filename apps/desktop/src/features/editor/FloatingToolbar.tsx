/**
 * 悬浮工具条（m1.5 收尾，§5.2；m1.6 反馈轮 #106 修可达性）
 * 显示条件：① 真实文字选区（from!==to）；② 光标位于「选区矩形 ∪ 工具条自身 ∪ 过渡走廊」内（用户主动靠近才出现，不遮阅读）；
 *          ③ 右键菜单未打开（职责分离 #93）。
 * 本次修复的三个实证根因：
 *   1. 旧判定框只取选区两端光标 ±4px，而工具条悬在选区上方 8px → 移动途中有 4px 死区，工具条永远够不到；
 *   2. 内层隐藏时外层 BubbleMenu 容器仍可命中 → 点中即清空文本选区 → 门控条件失效、不重新选中永不恢复；
 *   3. portal 位于 .paper-scale（zoom 变换）内，fit-width 非 100% 时绝对定位按缩放坐标错算 → appendTo body + fixed。
 * 链接编辑态：prompt 在 Tauri/IAB 被静默吞（实测），改应用内行内输入行。
 */
// v3：BubbleMenu 移到 @tiptap/react/menus 子路径（floating-ui 可选依赖）
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  pointInRects,
  reachableRects,
  rectsFromClientRects,
  rectsFromEndpoints,
  type Rect,
} from './toolbar-hover.js';

/** 鼠标离开可达区后的隐藏宽限：快速斜向移动不闪断 */
const HIDE_GRACE_MS = 150;
const HOVER_PAD_PX = 8;
/** 显式 pluginKey：获得可控的 meta 通道（'show'/'hide'/'updatePosition'），供意外隐藏后自愈复显 */
const BUBBLE_PLUGIN_KEY = 'fl-bubble';

declare global {
  interface Window {
    /** dev-only 诊断日志（浮层被移除/焦点变化的时间线，定位 hide 诱因用） */
    __flBubbleLog?: Array<Record<string, unknown>>;
  }
}

export function FloatingToolbar({ editor, readOnly }: { editor: Editor | null; readOnly?: boolean }) {
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkDraft, setLinkDraft] = useState('https://');
  // 光标是否位于可达区（选区 ∪ 工具条 ∪ 走廊）
  const [reachable, setReachable] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1, y: -1 });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 工具条最近一次几何：插件 hide() 会把元素 remove（脱离文档），此时仍要能判定"光标在其上" */
  const lastBarRect = useRef<Rect | null>(null);
  /** 鼠标按下（拖选中）期间一律不显示工具条（#107：逐字拖选时工具条不该跟随） */
  const pointerDownRef = useRef(false);
  /** 链接编辑态绑定进入时的选区：选区一变即退出（#107） */
  const linkEditingRef = useRef(false);
  const linkSelRef = useRef<{ from: number; to: number } | null>(null);
  useEffect(() => {
    linkEditingRef.current = linkEditing;
  }, [linkEditing]);

  // 可达区重算：真实多行选区矩形 + 工具条矩形 + 走廊
  const computeReachable = useCallback(() => {
    if (!editor) return false;
    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) return false;
    let selRects: Rect[] = [];
    const domSel = window.getSelection();
    if (domSel && domSel.rangeCount > 0 && !domSel.isCollapsed) {
      selRects = rectsFromClientRects(domSel.getRangeAt(0).getClientRects());
    }
    if (selRects.length === 0) {
      // 退化：PM 选区可用但 DOM selection 不可读（如多 range）→ 端点包围盒
      try {
        const a = editor.view.coordsAtPos(from);
        const b = editor.view.coordsAtPos(to);
        selRects = rectsFromEndpoints({ x: a.left, y: a.top }, { x: b.left, y: b.bottom });
      } catch {
        return false;
      }
    }
    const bar = barRef.current;
    const box = bar && bar.isConnected ? bar.getBoundingClientRect() : null;
    if (box) {
      lastBarRect.current = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }
    const toolbarRect = lastBarRect.current;
    return pointInRects(mouseRef.current, reachableRects(selRects, toolbarRect), HOVER_PAD_PX);
  }, [editor]);

  const refresh = useCallback(() => {
    // 拖选中：一律隐藏，松手后按光标位置重新判定（#107）
    if (pointerDownRef.current) {
      setReachable(false);
      return;
    }
    // 链接编辑态随选区失效（#107）：选区变化即退出，避免在旧选区上残留输入行
    if (linkEditingRef.current && linkSelRef.current && editor && !editor.isDestroyed) {
      const { from, to } = editor.state.selection;
      if (from !== linkSelRef.current.from || to !== linkSelRef.current.to) {
        linkSelRef.current = null;
        setLinkEditing(false);
      }
    }
    const next = computeReachable();
    if (next) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      setReachable(true);
      // 自愈：插件任何一次 hide() 都会把元素 remove 出文档；选区仍有效且光标在可达区时强制复显
      if (editor && !editor.isDestroyed && !document.querySelector('.float-bar')) {
        editor.view.dispatch(editor.state.tr.setMeta(BUBBLE_PLUGIN_KEY, 'show'));
      }
      return;
    }
    if (!hideTimer.current) {
      hideTimer.current = setTimeout(() => {
        hideTimer.current = null;
        setReachable(false);
      }, HIDE_GRACE_MS);
    }
  }, [computeReachable, editor]);

  // 鼠标/选区/滚动驱动重算
  useEffect(() => {
    if (!editor) return;
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!pointerDownRef.current) refresh();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      pointerDownRef.current = true;
      setReachable(false);
    };
    const onMouseUp = () => {
      pointerDownRef.current = false;
      setTimeout(refresh, 0);
    };
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('selectionchange', refresh);
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', refresh, true);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('selectionchange', refresh);
      document.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('scroll', refresh, true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [editor, refresh]);

  // 隐藏时外层容器不接收指针：否则不可见浮层会吞掉 mousedown → 清空选区 → 永不恢复（#106 实证）
  const visible = reachable || linkEditing;
  useEffect(() => {
    const wrap = barRef.current?.parentElement;
    if (wrap) wrap.style.pointerEvents = visible ? 'auto' : 'none';
  }, [visible]);

  // Ctrl+K（选中文字）经 fl:insert-link 进入链接编辑态
  useEffect(() => {
    const onInsertLink = () => {
      if (!editor || editor.isDestroyed) return;
      const { from, to } = editor.state.selection;
      linkSelRef.current = { from, to };
      setLinkDraft('https://');
      setLinkEditing(true);
      setReachable(true);
    };
    window.addEventListener('fl:insert-link', onInsertLink);
    return () => window.removeEventListener('fl:insert-link', onInsertLink);
  }, [editor]);

  // 右键菜单开/关与画布滚动：派发空事务，让 BubbleMenu 的 shouldShow 与定位重新求值
  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr);
      });
    };
    const onCtxMenuChanged = () => {
      bump();
      refresh();
    };
    window.addEventListener('fl:ctx-menu-changed', onCtxMenuChanged);
    window.addEventListener('scroll', bump, true);
    window.addEventListener('resize', bump);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('fl:ctx-menu-changed', onCtxMenuChanged);
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener('resize', bump);
    };
  }, [editor, refresh]);

  // 定点修复（#106 实证诱因）：插件在 editor blur 时无条件 hide()（element.remove()），
  // 且该路径绕过自定义 shouldShow —— 表现为工具条"移入即消失、不重新选中永不恢复"。
  // 对策：blur 后若选区仍非空，立即复显元素、让 DOM 常驻；真实可见性仍由我们的可达区门控决定。
  useEffect(() => {
    if (!editor) return;
    const onBlur = () => {
      setTimeout(() => {
        if (editor.isDestroyed) return;
        const { from, to } = editor.state.selection;
        if (from !== to && !document.querySelector('.float-bar')) {
          editor.view.dispatch(editor.state.tr.setMeta(BUBBLE_PLUGIN_KEY, 'show'));
        }
      }, 0);
    };
    editor.on('blur', onBlur);
    return () => {
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // dev-only 诊断：记录浮层被移除的时刻与焦点/选区上下文（定位 hide 诱因；生产构建不启用）
  useEffect(() => {
    if (!import.meta.env.DEV || !editor) return;
    const log = (window.__flBubbleLog ??= []);
    const rec = (t: string, extra: Record<string, unknown> = {}) =>
      log.push({ t, at: Math.round(performance.now()), from: editor.state.selection.from, to: editor.state.selection.to, active: document.activeElement?.className || document.activeElement?.tagName || null, ctxMenu: !!document.querySelector('.ctx-menu'), ...extra });
    const onBlur = (payload: { event?: FocusEvent }) => rec('editor-blur', { related: (payload?.event?.relatedTarget as HTMLElement | null)?.className ?? null });
    const onFocus = () => rec('editor-focus');
    editor.on('blur', onBlur as never);
    editor.on('focus', onFocus as never);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of Array.from(m.removedNodes)) {
          if (n instanceof HTMLElement && (n.classList.contains('float-bar') || n.querySelector?.('.float-bar'))) rec('removed');
        }
      }
    });
    mo.observe(document.body, { childList: true });
    return () => {
      mo.disconnect();
      editor.off('blur', onBlur as never);
      editor.off('focus', onFocus as never);
    };
  }, [editor]);

  if (!editor || readOnly) return null;

  const applyLink = () => {
    const url = linkDraft.trim();
    if (/^(https?:|mailto:)/i.test(url)) {
      editor.chain().focus().setLink({ href: url }).run();
      setLinkEditing(false);
      linkSelRef.current = null;
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={BUBBLE_PLUGIN_KEY}
      updateDelay={0}
      appendTo={() => document.body}
      options={{ placement: 'top', offset: 8, strategy: 'fixed' }}
      shouldShow={({ from, to }) => from !== to && !document.querySelector('.ctx-menu')}
    >
      <div
        ref={barRef}
        className="float-bar live"
        role="toolbar"
        aria-label="文字格式"
        style={{ visibility: visible ? 'visible' : 'hidden' }}
        onMouseDown={(e) => {
          // 点击工具条自身不得清空编辑器选区；输入框需要正常聚焦
          if ((e.target as HTMLElement).tagName === 'INPUT') return;
          e.preventDefault();
        }}
      >
        {linkEditing ? (
          <div className="link-edit">
            <input
              autoFocus
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyLink();
                if (e.key === 'Escape') {
                  setLinkEditing(false);
                  linkSelRef.current = null;
                }
              }}
              aria-label="链接地址"
              spellCheck={false}
            />
            <button onClick={applyLink} aria-label="确认链接">✓</button>
            <button onClick={() => { setLinkEditing(false); linkSelRef.current = null; }} aria-label="取消">✕</button>
          </div>
        ) : (
          <>
            <button
              aria-label="加粗"
              aria-pressed={editor.isActive('bold')}
              className={editor.isActive('bold') ? 'on' : ''}
              onClick={() => editor.chain().focus().toggleBold().run()}
            ><b>B</b></button>
            <button
              aria-label="斜体"
              aria-pressed={editor.isActive('italic')}
              className={editor.isActive('italic') ? 'on' : ''}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            ><i>I</i></button>
            <span className="v" />
            <button
              aria-label="链接"
              aria-pressed={editor.isActive('link')}
              title="Ctrl+K（选中文字时）"
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run();
                  return;
                }
                const { from, to } = editor.state.selection;
                linkSelRef.current = { from, to }; // 绑定当前选区：选区一变即自动退出（#107）
                setLinkDraft('https://');
                setLinkEditing(true);
              }}
            >🔗</button>
            <span className="v" />
            <button className="ai" disabled title="AI 改写（M3 接管）">✦ 改写</button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
