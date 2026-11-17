/** 照片槽 NodeView（#117）：无资产时显示预览同款虚线占位；真实上传随 m5.1 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Camera } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../../app/Toast.js';

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
      role={placeholder ? 'button' : undefined}
      tabIndex={placeholder ? 0 : undefined}
      aria-label={placeholder ? t('editor.photo') : undefined}
      // #127：照片上传未开放——点击给明确说明，不再是"点了没反应"的死图标
      onClick={() => placeholder && toast(t('editor.photoUnavailable'))}
      onKeyDown={(e: ReactKeyboardEvent) => {
        if (!placeholder) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toast(t('editor.photoUnavailable'));
        }
      }}
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
