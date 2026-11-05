/** 页头 NodeView（#117）：预览同款姓名/意向/联系方式；点击铅笔编辑 profile */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokenizeContactLine } from '../contact-line.js';
import { MetaDialog } from './MetaDialog.js';

export function PageHeaderView({ node, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const name = String(node.attrs.name ?? '');
  const headline = String(node.attrs.headline ?? '');
  const contactLine = String(node.attrs.contactLine ?? '');
  const tokens = tokenizeContactLine(contactLine);

  return (
    <NodeViewWrapper className="fl-head" data-type="fl-page-header" contentEditable={false}>
      <div className="name">
        <b>{name || t('editor.namePlaceholder')}</b>
        {headline && <span className="intent">{headline}</span>}
        <button
          type="button"
          className="fl-edit-btn"
          aria-label={t('editor.editProfile')}
          title={t('editor.editProfile')}
          onClick={() => setOpen(true)}
        >
          <Pencil size={12} />
        </button>
      </div>
      {contactLine && (
        <p className="contact">
          {tokens.map((token, index) =>
            token.type === 'link' ? (
              <a key={index} href={token.href} onClick={(e) => e.preventDefault()}>{token.text}</a>
            ) : (
              <span key={index}>{token.text}</span>
            ),
          )}
        </p>
      )}
      <div className="rule" />
      {open && (
        <MetaDialog
          title={t('editor.profileTitle')}
          fields={[
            { key: 'name', label: t('editor.name'), value: name, required: true },
            { key: 'headline', label: t('editor.headline'), value: headline },
            { key: 'contactLine', label: t('editor.contact'), value: contactLine },
          ]}
          onSave={(values) => {
            updateAttributes({
              name: (values.name ?? '').trim(),
              headline: (values.headline ?? '').trim() || null,
              contactLine: (values.contactLine ?? '').trim() || null,
            });
            return null;
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
