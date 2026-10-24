/**
 * 悬浮工具条（m1.5 收尾，§5.2）：选中文字时浮现——加粗/斜体/链接 + AI 改写入口。
 * BubbleMenu 跟随选区；无选区不渲染。AI 改写按钮 M3 接管（先禁用态占位）。
 */
// v3：BubbleMenu 移到 @tiptap/react/menus 子路径（floating-ui 可选依赖）
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';

export function FloatingToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor: ed, from, to }) => from !== to && !ed.state.selection.empty}
    >
      <div className="float-bar live" role="toolbar" aria-label="文字格式">
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
            const url = window.prompt('链接地址（http/https/mailto）', 'https://');
            if (url && /^(https?:|mailto:)/i.test(url)) editor.chain().focus().setLink({ href: url }).run();
          }}
        >🔗</button>
        <span className="v" />
        <button className="ai" disabled title="AI 改写（M3 接管）">✦ 改写</button>
      </div>
    </BubbleMenu>
  );
}
