/** 条目头 NodeView（#117）：org/role/date 三段；点击编辑元信息（日期纯文本解析） */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateRange, parseDateRange } from '../entry-meta.js';
import { MetaDialog } from './MetaDialog.js';

export function EntryHeaderView({ node, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const org = String(node.attrs.org ?? '');
  const role = String(node.attrs.role ?? '');
  const date = formatDateRange(
    node.attrs.start as string | null,
    node.attrs.end as string | null,
    node.attrs.ongoing as boolean | null,
  );

  return (
    <NodeViewWrapper className="fl-entry-head" data-type="fl-entry-header" contentEditable={false}>
      <div
        className="row"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <b>{org || t('editor.orgPlaceholder')}</b>
        {role && <span className="role">{role}</span>}
        {date && <span className="date">{date}</span>}
        <button
          type="button"
          className="fl-edit-btn"
          aria-label={t('editor.editEntryMeta')}
          title={t('editor.editEntryMeta')}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Pencil size={12} />
        </button>
      </div>
      {open && (
        <MetaDialog
          title={t('editor.entryMetaTitle')}
          fields={[
            { key: 'org', label: t('editor.org'), value: org, required: true },
            { key: 'role', label: t('editor.role'), value: role },
            { key: 'date', label: t('editor.dateRange'), value: date, placeholder: '2022.09 – 2026.06' },
          ]}
          onSave={(values) => {
            const parsed = parseDateRange(values.date ?? '');
            if (!parsed) return t('editor.dateInvalid');
            updateAttributes({
              org: (values.org ?? '').trim(),
              role: (values.role ?? '').trim() || null,
              start: parsed.start ?? null,
              end: parsed.end ?? null,
              ongoing: parsed.ongoing ?? null,
            });
            return null;
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
