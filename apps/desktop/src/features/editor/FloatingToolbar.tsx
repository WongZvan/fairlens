/**
 * 悬浮工具条（m1.5 收尾，§5.2）：选中文字 + 光标悬停于选区之上时浮现——加粗/斜体/链接 + AI 改写入口。
 * 显示条件（docs/01 §5.2，用户反馈定案）：
 *   ① 真实文字选区（from!==to）；
 *   ② 光标（鼠标）位于选区矩形内（用户主动把光标放上去才出现，不遮阅读）；
 *   ③ 右键菜单未打开（职责分离 #93）。
 * 链接编辑态：prompt 在 Tauri/IAB 被静默吞（实测），改应用内行内输入行。
 */
// v3：BubbleMenu 移到 @tiptap/react/menus 子路径（floating-ui 可选依赖）
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';

import { useEffect, useState } from 'react';

export function FloatingToolbar({ editor }: { editor: Editor | null }) {
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkDraft, setLinkDraft] = useState('https://');
  // ② 光标是否悬停在选区矩形内（selectionchange/mousemove 双驱动）
  const [hoverOnSelection, setHoverOnSelection] = useState(false);
  if (!editor) return null;

  const applyLink = () => {
    const url = linkDraft.trim();
    if (/^(https?:|mailto:)/i.test(url)) {
      editor.chain().focus().setLink({ href: url }).run();
      setLinkEditing(false);
    }
  };

  // 选区矩形（视口坐标）；每次 selectionchange 后重算
  useEffect(() => {
    const updateHover = () => {
      const { state, view } = editor;
      const { from, to, empty } = state.selection;
      if (empty || from === to) {
        setHoverOnSelection((prev) => (prev ? false : prev)); // 值不变不触发渲染
        return;
      }
      try {
        const a = view.coordsAtPos(from);
        const b = view.coordsAtPos(to);
        const rect = {
          left: Math.min(a.left, b.left),
          right: Math.max(a.right, b.right),
          top: Math.min(a.top, b.top),
          bottom: Math.max(a.bottom, b.bottom),
        };
        const next =
          lastMouse.x >= rect.left - 4 &&
          lastMouse.x <= rect.right + 4 &&
          lastMouse.y >= rect.top - 4 &&
          lastMouse.y <= rect.bottom + 4;
        setHoverOnSelection((prev) => (prev === next ? prev : next)); // 值相同跳过渲染（防抖）
      } catch {
        setHoverOnSelection(false);
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
      updateHover();
    };
    // mouseup 后延迟一帧重估（拖选结束 PM 稳定期内不抖）
    const onMouseUp = () => setTimeout(updateHover, 60);
    document.addEventListener('selectionchange', updateHover);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('selectionchange', updateHover);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ from, to }) => from !== to && !document.querySelector('.ctx-menu')}
    >
      <div
        className="float-bar live"
        role="toolbar"
        aria-label="文字格式"
        style={{ visibility: hoverOnSelection || linkEditing ? 'visible' : 'hidden' }}
      >
        {linkEditing ? (
          <div className="link-edit">
            <input
              autoFocus
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyLink();
                if (e.key === 'Escape') setLinkEditing(false);
              }}
              aria-label="链接地址"
              spellCheck={false}
            />
            <button onClick={applyLink} aria-label="确认链接">✓</button>
            <button onClick={() => setLinkEditing(false)} aria-label="取消">✕</button>
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

/** 最近鼠标位置（模块级；mousemove 跟踪） */
const lastMouse = { x: -1, y: -1 };
if (typeof document !== 'undefined') {
  document.addEventListener(
    'mousemove',
    (e) => {
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
    },
    { passive: true },
  );
}
