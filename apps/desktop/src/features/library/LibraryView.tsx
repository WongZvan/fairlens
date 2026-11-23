/**
 * 简历库首页（m1.8 / #129）：模板卡新建、卡片打开/重命名/软归档/删除、空态与未开放能力。
 * 预览基线：docs/design-previews/fairlens-library-m18-preview.html（2026-11-23 定稿）。
 *
 * 并发/失败模型（2026-11-23，codex 复核）：初始化单飞且模板卡禁用；
 * 重命名/删除失败保留弹窗并显示错误；归档失败 toast 提示，不再只报成功。
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

export function RenameDialog({ meta, onClose, onSave }: {
  meta: ResumeMeta;
  onClose: () => void;
  /** 返回是否落库成功；失败时弹窗保持打开 */
  onSave: (title: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(meta.title);
  const [error, setError] = useState<'empty' | 'failed' | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = title.trim();
    if (!value) { setError('empty'); return; }
    setSaving(true);
    setError(null);
    try {
      const ok = await onSave(value);
      if (ok) onClose();
      else setError('failed');
    } finally {
      setSaving(false);
    }
  };

  const errorText = error === 'empty' ? t('library.titleEmpty') : error === 'failed' ? t('library.renameFailed') : null;

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
          disabled={saving}
          onChange={(e) => { setTitle(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            void submit();
          }}
        />
      </label>
      {errorText && <p className="lib-dialog-error">{errorText}</p>}
      <div className="meta-actions">
        <button type="button" disabled={saving} onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="primary" disabled={saving} onClick={() => void submit()}>
          {saving ? t('saveStatus.saving') : t('common.save')}
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
  const initialized = useLibrary((s) => s.initialized);
  const syncError = useLibrary((s) => s.syncError);
  const cleanupPending = useLibrary((s) => s.cleanupPending);
  const sampleResumeId = useLibrary((s) => s.sampleResumeId);
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<ResumeMeta | null>(null);
  const [deleting, setDeleting] = useState<ResumeMeta | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // 单飞 init + 每次挂载刷新：编辑器“清空示例”会删 sampleResumeId，返回库页必须同步
    void (async () => {
      await useLibrary.getState().init();
      await useLibrary.getState().refresh();
    })().catch(() => {});
  }, []);

  const active = metas.filter((m) => m.status === 'active');
  const archived = archivedCount(metas);
  const visible = visibleResumes(metas, showArchived);
  const isEmpty = metas.length === 0;

  const create = async (templateId: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const { id, outcome } = await useLibrary.getState().createFromTemplate({
        templateId,
        titleBase: t('library.newTitle'),
        basicSection: t('editor.blankSectionTitle'),
      });
      if (!id || outcome === 'write-failed') { toast(t('library.createFailed')); return; }
      if (outcome === 'refresh-failed') toast(t('library.doneButRefreshFailed'));
      onOpen(id);
    } finally {
      setCreating(false);
    }
  };

  const archive = (meta: ResumeMeta) => {
    const nextArchived = meta.status !== 'archived';
    void useLibrary.getState().setArchived(meta.id, nextArchived).then((outcome) => {
      if (outcome === 'write-failed') { toast(t('library.actionFailed')); return; }
      if (outcome === 'refresh-failed') { toast(t('library.doneButRefreshFailed')); return; }
      toast(nextArchived ? t('library.archivedToast', { title: meta.title }) : t('library.unarchivedToast', { title: meta.title }));
    });
  };

  return (
    <main className={`lib-home${isEmpty ? ' is-empty' : ''}`} aria-busy={!initialized}>
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

      {syncError ? (
        <div className="lib-init-error">
          <p>{initialized ? t('library.syncFailed') : t('library.initFailed')}</p>
          <button
            type="button"
            className="lib-btn"
            onClick={() => {
              const store = useLibrary.getState();
              void (store.initialized ? store.refresh() : store.init()).catch(() => {});
            }}
          >
            {t('library.reload')}
          </button>
        </div>
      ) : null}
      {cleanupPending ? (
        <div className="lib-init-error">
          <p>{t('library.cleanupPending')}</p>
          <button
            type="button"
            className="lib-btn"
            onClick={() => {
              void useLibrary.getState().retrySampleCleanup().then((ok) => {
                toast(ok ? t('library.cleanupDone') : t('library.actionFailed'));
              });
            }}
          >
            {t('library.retryCleanup')}
          </button>
        </div>
      ) : null}

      <div className="lib-create-row">
        <div className="lib-tpl-quick">
          {TEMPLATE_CHOICES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="lib-tpl"
              data-tpl={tpl.id}
              disabled={!initialized || creating}
              title={initialized ? t('library.templateNew') : t('library.preparing')}
              onClick={() => void create(tpl.id)}
            >
              <span className="lib-tpl-thumb" aria-hidden="true" />
              <span className="lib-tpl-name">{t(tpl.key)}</span>
              <span className="lib-tpl-hint">{initialized ? t('library.templateNew') : t('library.preparing')}</span>
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
                {meta.id === sampleResumeId && <span className="lib-badge">{t('library.sampleBadge')}</span>}
                {isArchived && <span className="lib-tag">{t('library.archivedBadge')}</span>}
              </div>
              <CardMenu
                meta={meta}
                onOpen={() => onOpen(meta.id)}
                onRename={() => setRenaming(meta)}
                onArchive={() => archive(meta)}
                onDelete={() => {
                  setDeleteError(null);
                  setDeleting(meta);
                }}
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
        {isEmpty && initialized && (
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
          onSave={async (title) => {
            const outcome = await useLibrary.getState().rename(renaming.id, title);
            if (outcome === 'write-failed') return false;
            toast(outcome === 'ok' ? t('library.renamedToast') : t('library.doneButRefreshFailed'));
            return true;
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? t('library.deleteTitle', { title: deleting.title }) : ''}
        body={deleting ? t('library.deleteBody', { count: deleting.snapshotCount }) : ''}
        confirmLabel={t('library.delete')}
        pending={deletePending}
        error={deleteError}
        onConfirm={() => {
          if (!deleting || deletePending) return;
          const target = deleting;
          setDeletePending(true);
          setDeleteError(null);
          void useLibrary.getState().remove(target.id).then((outcome) => {
            setDeletePending(false);
            if (outcome === 'write-failed') {
              setDeleteError(t('library.deleteFailed'));
              return;
            }
            setDeleting(null);
            if (outcome === 'cleanup-failed') {
              toast(t('library.deletedButCleanupFailed'));
              return;
            }
            toast(outcome === 'ok'
              ? t('library.deletedToast', { title: target.title })
              : t('library.doneButRefreshFailed'));
          });
        }}
        onClose={() => { if (!deletePending) setDeleting(null); }}
      />
    </main>
  );
}
