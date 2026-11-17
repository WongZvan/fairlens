/** 分区标题 NodeView（#127）：标题文字 + hover「＋」新增条目（画布内联入口） */
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Plus } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

export function SectionHeaderView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { editor, getPos } = props;

  const addEntry = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const $pos = editor.state.doc.resolve(pos + 1);
    for (let d = $pos.depth; d >= 1; d -= 1) {
      const node = $pos.node(d);
      if (node.type.name !== 'flSection') continue;
      let count = 0;
      node.forEach((child) => {
        if (child.type.name === 'flEntry') count += 1;
      });
      editor.commands.insertEntry({ sectionId: String(node.attrs.id ?? ''), index: count });
      editor.commands.focus();
      return;
    }
  };

  /** 标题被清空时补占位：否则序列化回落旧 attrs.title，用户会以为"删不掉"（#127） */
  const ensureTitle = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'flSectionHeader' || node.textContent.trim()) return;
    const placeholder = t('editor.untitledSection');
    const tr = editor.state.tr.insertText(placeholder, pos + 1, pos + 1 + node.content.size);
    editor.view.dispatch(tr);
  };

  return (
    <NodeViewWrapper as="h3" data-type="fl-section-header" className="fl-section-head" onBlur={ensureTitle}>
      <NodeViewContent className="fl-section-title" />
      <button
        type="button"
        className="fl-add-entry"
        contentEditable={false}
        aria-label={t('editor.addEntry')}
        title={t('editor.addEntry')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={addEntry}
      >
        <Plus size={12} strokeWidth={2.4} />
        {t('editor.addEntry')}
      </button>
    </NodeViewWrapper>
  );
}
