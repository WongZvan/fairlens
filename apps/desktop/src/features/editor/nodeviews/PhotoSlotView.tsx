/** 照片槽 NodeView（#117）：无资产时显示预览同款虚线占位；真实上传随 m5.1 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PhotoSlotView({ node }: NodeViewProps) {
  const { t } = useTranslation();
  const src = typeof node.attrs.blobRef === 'string' ? node.attrs.blobRef : '';
  const placeholder = node.attrs.placeholder === true || !src;

  return (
    <NodeViewWrapper
      className="fl-photo-slot"
      data-type="fl-photo-slot"
      data-block-id={typeof node.attrs.id === 'string' ? node.attrs.id : undefined}
      contentEditable={false}
    >
      {placeholder ? (
        <>
          <Camera size={14} />
          <span>{t('editor.photo')}</span>
        </>
      ) : (
        <img src={src} alt="" />
      )}
    </NodeViewWrapper>
  );
}
