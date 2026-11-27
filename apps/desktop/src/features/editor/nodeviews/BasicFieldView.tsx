/**
 * 基本信息字段 NodeView（#117；2026-11-13 #122 增增删改）：
 * value 原生编辑（inline）；label/href 由铅笔对话框改；行尾 + 追加字段、垃圾桶删除。
 */
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { nanoid } from '../../../lib/nanoid.js';
import { isSafeHref } from '../link-policy.js';
import { MetaDialog } from './MetaDialog.js';

export function BasicFieldView({ node, updateAttributes, editor, getPos, deleteNode }: NodeViewProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = String(node.attrs.label ?? '');
  const href = typeof node.attrs.href === 'string' && isSafeHref(node.attrs.href) ? node.attrs.href : null;
  const value = <NodeViewContent className="fl-field-value" />;

  const addAfter = () => {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos === null || pos === undefined) return;
    const fieldType = editor.schema.nodes.flBasicField;
    if (!fieldType) return;
    const at = pos + node.nodeSize;
    const next = fieldType.create({ id: nanoid(), label: t('editor.fieldLabelDefault'), href: null }, editor.schema.text(' '));
    // 新字段插入后把光标放到其值末尾：用户点「添加字段」即可直接打字
    editor.chain().focus().insertContentAt(at, next).setTextSelection(at + next.nodeSize - 1).run();
  };

  /**
   * 点击字段行本身（标签/空白）时把光标落到值末尾。
   * 只处理左键；值编辑区/操作按钮不拦截；**必须排除 MetaDialog**——
   * Overlay 是 portal，React 事件仍会冒泡到 NodeView，若误拦会把输入写进正文。
   */
  const focusValueEnd = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.meta-overlay') || target.closest('.meta-win')) return;
    if (target.closest('.fl-field-value') || target.closest('.fl-field-actions')) return;
    if (target !== e.currentTarget && !target.closest('.fl-field-label')) return;
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (typeof pos !== 'number') return;
    e.preventDefault();
    editor.chain().focus().setTextSelection(pos + node.nodeSize - 1).run();
  };

  return (
    <NodeViewWrapper
      className="fl-basic-field"
      data-type="fl-basic-field"
      data-block-id={typeof node.attrs.id === 'string' ? node.attrs.id : undefined}
      onMouseDown={focusValueEnd}
    >
      {label && <span className="fl-field-label">{label}</span>}
      {href ? <a href={href} onClick={(e) => e.preventDefault()}>{value}</a> : value}
      <span className="fl-field-actions" contentEditable={false}>
        <button
          type="button"
          className="fl-edit-btn"
          aria-label={t('editor.fieldEdit')}
          title={t('editor.fieldEdit')}
          onClick={() => setOpen(true)}
        >
          <Pencil size={12} />
        </button>
        <button type="button" className="fl-edit-btn" aria-label={t('editor.addField')} title={t('editor.addField')} onClick={addAfter}>
          <Plus size={12} />
        </button>
        <button type="button" className="fl-edit-btn" aria-label={t('editor.removeField')} title={t('editor.removeField')} onClick={() => deleteNode()}>
          <Trash2 size={12} />
        </button>
      </span>
      {open && (
        <MetaDialog
          title={t('editor.fieldEdit')}
          fields={[
            { key: 'label', label: t('editor.fieldLabel'), value: label, required: true },
            { key: 'href', label: t('editor.fieldHref'), value: href ?? '' },
          ]}
          onSave={(values) => {
            const nextHref = (values.href ?? '').trim();
            if (nextHref && !isSafeHref(nextHref)) return t('editor.fieldHrefInvalid');
            updateAttributes({
              label: (values.label ?? '').trim() || t('editor.fieldLabelDefault'),
              href: nextHref || null,
            });
            return null;
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}