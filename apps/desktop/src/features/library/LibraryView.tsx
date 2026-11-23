/**
 * 简历库首页（m1.8 / #129）：模板卡新建、卡片打开/重命名/软归档/删除、空态与未开放能力。
 * 预览基线：docs/design-previews/fairlens-library-m18-preview.html（2026-11-23 定稿）。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { ResumeMeta } from '@fairlens/core';
import { Dropdown } from '../../app/dropdown.js';
import { Overlay } from '../../app/Overlay.js';
import { ConfirmDialog } from '../../app/ConfirmDialog.js';
import { toast } from '../../app/Toast.js';
import { useLibrary } from '../../stores/library.js';
import { TEMPLATE_CHOICES } from '../templates/choices.js';
import { SAMPLE_RESUME_TITLE } from '../editor-mockup/sample-data.js';
import { archivedCount, formatUpdatedAt, visibleResumes } from './library-view-model.js';
import './library.css';

export interface LibraryViewProps {
  onOpen: (id: string) => void;
}

function updatedLabel(t: TFunction, iso: string): string {
  const at = formatUpdatedAt(iso);
  if (at.kind === 'today') return t('library.updatedToday', { time: at.time });
  if (at.kind === 'yesterday') return t('library.updatedYesterday', { time: at.time });
  return t('library.updatedDate', { date: at.date });
}

function RenameDialog({ meta, onClose, onSave }: {
  meta: ResumeMeta;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(meta.title);
  const [error, setError] = useState(false);

  return (
    <Overlay open onClose={onClose} label={t('library.renameTitle')} overlayClassName="meta-overlay" boxClassName="meta-win">
      <h3>{t('library.renameTitle')}</h3>
      <p className="muted small">{t('library.renameHint')}</p>
      <label className="meta-field">
        <span>{t('library.renameTitle')}</span>
        <input
          value={title}
          aria-label={t('library.renameTitle')}
          maxLength={40}
          onChange={(e) => { setTitle(e.target.value); setError(false); }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (!title.trim()) { setError(true); return; }
            onSave(title.trim());
            onClose();
          }}
        />
      </label>
      {error && <p className="lib-dialog-error">{t('library.titleEmpty')}</p>}
      <div className="meta-actions">
        <button type="button" onClick={onClose}>{t('common.cancel')}</button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (!title.trim()) { setError(true); return; }
            onSave(title.trim());
            onClose();
          }}
        >
          {t('common.save')}
        </button>
      </div>
    </Overlay>
  );
}

function CardMenu({ meta, onOpen, onRename, onArchive, onDelete }: {
  meta: ResumeMeta;
  onOpen: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const archived = meta.status === 'archived';
  return (
    <div className="lib-more">
      <button
        ref={btnRef}
        type="button"
        className="lib-more-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('library.more', { title: meta.title })}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      <Dropdown open={open} anchorRef={btnRef} align="right" role="menu" onClose={() => setOpen(false)}>
        <button type="button" role="menuitem" className="cmd-item" onClick={() => { setOpen(false); onOpen(); }}>
          {t('library.menuOpen')}
        </button>
        <button type="button" role="menuitem" className="cmd-item" onClick={() => { setOpen(false); onRename(); }}>
          {t('library.menuRename')}
        </button>
        <button type="button" role="menuitem" className="cmd-item" onClick={() => { setOpen(false); onArchive(); }}>
          {archived ? t('library.menuUnarchive') : t('library.menuArchive')}
        </button>
        <div className="cmd-sep" role="separator" />
        <button type="button" role="menuitem" className="cmd-item lib-danger" onClick={() => { setOpen(false); onDelete(); }}>
          {t('library.menuDelete')}
        </button>
      </Dropdown>
    </div>
  );
}

export function LibraryView({ onOpen }: LibraryViewProps) {
  const { t } = useTranslation();
  const metas = useLibrary((s) => s.metas);
  const loading = useLibrary((s) => s.loading);
  const [showArchived, setShowArchived] = useState(false);
  const [renaming, setRenaming] = useState<ResumeMeta | null>(null);
  const [deleting, setDeleting] = useState<ResumeMeta | null>(null);

  useEffect(() => {
    void (async () => {
      await useLibrary.getState().ensureSeedSample();
      await useLibrary.getState().refresh();
    })();
  }, []);

  const active = metas.filter((m) => m.status === 'active');
  const archived = archivedCount(metas);
  const visible = visibleResumes(metas, showArchived);
  const isEmpty = metas.length === 0;

  const create = async (templateId: string) => {
    const id = await useLibrary.getState().createFromTemplate({
      templateId,
      titleBase: t('library.newTitle'),
      basicSection: t('editor.blankSectionTitle'),
    });
    if (!id) { toast(t('library.createFailed')); return; }
    onOpen(id);
  };

  return (
    <main className={`lib-home${isEmpty ? ' is-empty' : ''}`}>
      <header className="lib-head">
        <h1>{t('library.title')}</h1>
        <span className="lib-sub">
          {t('library.count', { count: active.length })}
          {archived > 0 ? ` · ${t('library.archivedCount', { count: archived })}` : ''}
          {' · '}{t('library.dataLocal')}
        </span>
        <span className="lib-spacer" />
        <label className="lib-switch" title={t('library.showArchived')}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <span className="lib-switch-track" aria-hidden="true" />
          {t('library.showArchived')}
        </label>
        <button type="button" className="lib-btn" disabled title={t('library.backupUnavailable')}>
          {t('library.backup')}
          <span className="lib-tag">{t('library.unavailable')}</span>
        </button>
      </header>

      <div className="lib-create-row">
        <div className="lib-tpl-quick">
          {TEMPLATE_CHOICES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="lib-tpl"
              data-tpl={tpl.id}
              title={t('library.templateNew')}
              onClick={() => void create(tpl.id)}
            >
              <span className="lib-tpl-thumb" aria-hidden="true" />
              <span className="lib-tpl-name">{t(tpl.key)}</span>
              <span className="lib-tpl-hint">{t('library.templateNew')}</span>
            </button>
          ))}
        </div>
        {!isEmpty && (
          <div className="lib-import" aria-disabled="true" title={t('library.importUnavailable')}>
            <span className="lib-import-icon" aria-hidden="true">⇩</span>
            <span>
              <b>{t('library.importUnavailable')}</b>
              <br />
              {t('library.importHint')}
            </span>
            <span className="lib-tag">{t('library.unavailable')}</span>
          </div>
        )}
      </div>
      {isEmpty && <p className="lib-empty-note">{t('library.importNote')}</p>}

      <div className="lib-cards">
        {visible.map((meta) => {
          const isArchived = meta.status === 'archived';
          return (
            <article key={meta.id} className={`lib-card${isArchived ? ' is-archived' : ''}`}>
              <button
                type="button"
                className="lib-card-open"
                aria-label={t('library.open', { title: meta.title })}
                onClick={() => onOpen(meta.id)}
              />
              <h2 className="lib-card-title">{meta.title}</h2>
              <p className="lib-card-meta">
                {t(TEMPLATE_CHOICES.find((c) => c.id === meta.templateId)?.key ?? 'editor.tplClassic')}
                {' · '}{updatedLabel(t, meta.updatedAt)}
              </p>
              <p className="lib-card-meta">
                {meta.snapshotCount > 0
                  ? t('library.snapshots', { count: meta.snapshotCount })
                  : t('library.noSnapshots')}
                {isArchived ? ` · ${t('library.archivedBadge')}` : ''}
              </p>
              <div className="lib-card-foot">
                {meta.title === SAMPLE_RESUME_TITLE && <span className="lib-badge">{t('library.sampleBadge')}</span>}
                {isArchived && <span className="lib-tag">{t('library.archivedBadge')}</span>}
              </div>
              <CardMenu
                meta={meta}
                onOpen={() => onOpen(meta.id)}
                onRename={() => setRenaming(meta)}
                onArchive={() => {
                  void useLibrary.getState().setArchived(meta.id, !isArchived).then((ok) => {
                    if (ok) toast(isArchived ? t('library.unarchivedToast', { title: meta.title }) : t('library.archivedToast', { title: meta.title }));
                  });
                }}
                onDelete={() => setDeleting(meta)}
              />
            </article>
          );
        })}
        {!visible.length && !isEmpty && (
          <div className="lib-empty-card">
            <b>{t('library.allArchivedTitle')}</b>
            {t('library.allArchivedHint')}
          </div>
        )}
        {isEmpty && (
          <div className="lib-empty-card">
            <b>{t('library.emptyTitle')}</b>
            {t('library.emptyHint')}
          </div>
        )}
      </div>

      {loading && <p className="lib-loading">{t('library.loading')}</p>}

      {renaming && (
        <RenameDialog
          meta={renaming}
          onClose={() => setRenaming(null)}
          onSave={(title) => {
            void useLibrary.getState().rename(renaming.id, title).then((ok) => {
              if (ok) toast(t('library.renamedToast'));
            });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? t('library.deleteTitle', { title: deleting.title }) : ''}
        body={deleting ? t('library.deleteBody', { count: deleting.snapshotCount }) : ''}
        confirmLabel={t('library.delete')}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (!target) return;
          void useLibrary.getState().remove(target.id).then((ok) => {
            if (ok) toast(t('library.deletedToast', { title: target.title }));
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </main>
  );
}
