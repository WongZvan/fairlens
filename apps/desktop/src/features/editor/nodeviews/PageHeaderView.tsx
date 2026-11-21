/** 页头 NodeView（#117；#122 增附加字段）：预览同款姓名/意向/联系方式；点击铅笔编辑 profile */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokenizeContactLine } from '../contact-line.js';
import { ProfileFieldsDialog } from './ProfileFieldsDialog.js';

interface ExtraField {
  id: string;
  label: string;
  value: string;
  href?: string;
}

export function PageHeaderView({ node, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const name = String(node.attrs.name ?? '');
  const headline = String(node.attrs.headline ?? '');
  const contactLine = String(node.attrs.contactLine ?? '');
  const fields: ExtraField[] = Array.isArray(node.attrs.fields) ? (node.attrs.fields as ExtraField[]) : [];
  const tokens = tokenizeContactLine(contactLine);

  return (
    <NodeViewWrapper className="fl-head" data-type="fl-page-header" contentEditable={false}>
      <div className="name">
        {/* #128：未填姓名时画布显示占位；打印时由 print-shell 隐藏，绝不印进纸面 */}
        <b className={name.trim() ? undefined : 'name-placeholder'}>{name || t('editor.namePlaceholder')}</b>
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
      {fields.length > 0 && (
        // 附加字段并入联系方式行：复用既有 .fl-head .contact 规则，不新增 print CSS
        <p className="contact">
          {fields
            .filter((f) => f.label.trim())
            .map((f, index) => (
              <span key={f.id}>
                {index > 0 ? ' · ' : ''}
                {f.label}
                {f.value ? ` ${f.value}` : ''}
              </span>
            ))}
        </p>
      )}
      <div className="rule" />
      {open && (
        <ProfileFieldsDialog
          initial={{ name, headline, contactLine, fields }}
          onSave={(draft) => {
            updateAttributes({
              name: draft.name,
              headline: draft.headline || null,
              contactLine: draft.contactLine || null,
              fields: draft.fields,
            });
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
