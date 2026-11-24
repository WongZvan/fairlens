/** 条目头 NodeView（#117）：org/role/date 三段；点击编辑元信息（日期纯文本解析）；#127 加 ⋯ 复制/删除 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { MoreHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '../../../app/dropdown.js';
import { toast } from '../../../app/Toast.js';
import { formatDateRange, parseDateRange } from '../entry-meta.js';
import { MetaDialog } from './MetaDialog.js';

export function EntryHeaderView({ node, editor, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const entryId = String(node.attrs.id ?? '');
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
        {/* 操作区独立拦截冒泡：只保留一个 ⋯，避免“点偏左就开编辑框”（codex 真窗复现） */}
        <div className="row-actions" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <button
            ref={moreRef}
            type="button"
            className="fl-edit-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('editor.entryMenu')}
            title={t('editor.entryMenu')}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>
      <Dropdown open={menuOpen} anchorRef={moreRef} align="right" className="ctx-menu" role="menu" onClose={() => setMenuOpen(false)}>
        <button
          type="button"
          role="menuitem"
          className="ctx-item"
          onClick={() => {
            setMenuOpen(false);
            setOpen(true);
          }}
        >
          {t('editor.editEntryMeta')}
        </button>
        <button
          type="button"
          role="menuitem"
          className="ctx-item"
          onClick={() => {
            setMenuOpen(false);
            // #130：复制走统一确认流程（达到建议上限先确认）；NodeView 不直接执行命令
            window.dispatchEvent(new CustomEvent('fl:duplicate-entry', { detail: { entryId } }));
          }}
        >
          {t('editor.duplicateEntry')}
        </button>
        <button
          type="button"
          role="menuitem"
          className="ctx-item"
          onClick={() => {
            setMenuOpen(false);
            editor.commands.deleteEntry({ entryId });
            toast(t('editor.entryDeleted'));
          }}
        >
          {t('editor.deleteEntry')}
        </button>
      </Dropdown>
      {open && (
        <MetaDialog
          title={t('editor.entryMetaTitle')}
          fields={[
            { key: 'org', label: t('editor.org'), value: org },
            { key: 'role', label: t('editor.role'), value: role },
            { key: 'date', label: t('editor.dateRange'), value: date, placeholder: t('editor.dateRangePlaceholder') },
          ]}
          onSave={(values) => {
            // #122：日期为自由文本，解析器不再返回 null（空串=不显示日期）
            const parsed = parseDateRange(values.date ?? '') ?? { ongoing: false };
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
