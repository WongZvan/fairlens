/** 基本信息字段 NodeView（#117）：value 原生编辑；label 语义/导入用，href 走安全白名单 */
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { isSafeHref } from '../link-policy.js';

export function BasicFieldView({ node }: NodeViewProps) {
  const label = String(node.attrs.label ?? '');
  const href = typeof node.attrs.href === 'string' && isSafeHref(node.attrs.href) ? node.attrs.href : null;
  const value = <NodeViewContent className="fl-field-value" />;

  return (
    <NodeViewWrapper
      className="fl-basic-field"
      data-type="fl-basic-field"
      data-block-id={typeof node.attrs.id === 'string' ? node.attrs.id : undefined}
    >
      {label && <span className="fl-field-label">{label}</span>}
      {href ? <a href={href} onClick={(e) => e.preventDefault()}>{value}</a> : value}
    </NodeViewWrapper>
  );
}
