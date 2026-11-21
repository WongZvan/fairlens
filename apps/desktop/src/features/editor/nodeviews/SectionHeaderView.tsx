/**
 * 分区标题 NodeView（#127）：标题文字 + hover「＋」新增条目（画布内联入口）。
 * #128：基本信息分区改为「添加字段」——空白简历的第一道门是填所在地/联系方式，
 * 不是新建一条「机构名称」条目；空分区入口常显（不靠悬停才发现）。
 */
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Plus } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

export function SectionHeaderView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { editor, getPos } = props;

  /** 找到标题所属的 flSection（标题是分区的第一个子节点） */
  const section = (() => {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos === null || pos === undefined) return null;
    // getPos() 是节点前位置；resolve(pos) 落在父级边界上取不到 section，
    // 必须进节点内部（pos + 1）再向上找——与旧 addEntry 的写法一致。
    const $pos = editor.state.doc.resolve(pos + 1);
    for (let d = $pos.depth; d >= 1; d -= 1) {
      const node = $pos.node(d);
      if (node.type.name === 'flSection') return node;
    }
    return null;
  })();

  const sectionId = String(section?.attrs.id ?? '');
  const isBasic = section?.attrs.type === 'basic';
  /** 只有 header（childCount=1）视为空分区：入口常显，否则 hover 才出现 */
  const isEmpty = !!section && section.childCount <= 1;

  const addEntry = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!section) return;
    let count = 0;
    section.forEach((child) => {
      if (child.type.name === 'flEntry') count += 1;
    });
    editor.chain().focus().insertEntry({ sectionId, index: count }).run();
  };

  const addField = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!section) return;
    editor.chain().focus().addBasicField({ sectionId, label: t('editor.fieldLabelDefault') }).run();
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

  const label = isBasic ? t('editor.addField') : t('editor.addEntry');

  return (
    <NodeViewWrapper
      as="h3"
      data-type="fl-section-header"
      className={`fl-section-head${isEmpty ? ' is-empty' : ''}`}
      onBlur={ensureTitle}
    >
      <NodeViewContent className="fl-section-title" />
      <button
        type="button"
        className="fl-add-entry"
        contentEditable={false}
        aria-label={label}
        title={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={isBasic ? addField : addEntry}
      >
        <Plus size={12} strokeWidth={2.4} />
        {label}
      </button>
    </NodeViewWrapper>
  );
}
