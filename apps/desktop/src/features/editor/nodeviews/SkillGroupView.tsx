/** 技能组 NodeView（#117）：name 粗体前缀；items 为 inline 内容，hardBreak 分条 */
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export function SkillGroupView({ node }: NodeViewProps) {
  const name = String(node.attrs.name ?? '');
  return (
    <NodeViewWrapper
      className="fl-skill-group"
      data-type="fl-skill-group"
      data-block-id={typeof node.attrs.id === 'string' ? node.attrs.id : undefined}
    >
      {name && <b className="fl-skill-name">{name}</b>}
      <NodeViewContent className="fl-skill-items" />
    </NodeViewWrapper>
  );
}
