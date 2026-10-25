import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alignBlockDiff, type DiffStatus } from '@fairlens/core';
import type { SnapshotRow } from '@fairlens/shared';
import { useEditorDoc } from '../../stores/editor-doc.js';
import { CanvasEditor } from '../editor/CanvasEditor.js';
import { toast } from '../../app/Toast.js';

/**
 * 快照对话框（m1.6）：标签保存 + 双栏只读对比（左=快照/右=当前）+ 块级 diff 导航 + 一键回滚。
 * 规格：模块 MD「快照对比 UI 规格」（双栏/三态色标/回滚主按钮）；画布内嵌块高亮留快照中心统一落（偏离注记）。
 */
const STATUS_KEY: Record<DiffStatus, 'unchanged' | 'added' | 'removed' | 'changed'> = {
  unchanged: 'unchanged',
  added: 'added',
  removed: 'removed',
  changed: 'changed',
};

export function SnapshotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [snaps, setSnaps] = useState<SnapshotRow[]>([]);
  const [selected, setSelected] = useState<SnapshotRow | null>(null);
  const [label, setLabel] = useState('');
  const currentDoc = useEditorDoc((s) => s.doc);

  useEffect(() => {
    if (open) {
      void useEditorDoc.getState().listSnapshots().then((rows) => {
        setSnaps(rows);
        setSelected((prev) => rows.find((r) => r.id === prev?.id) ?? null);
      });
      setLabel('');
    }
  }, [open]);

  if (!open) return null;

  const refresh = () => useEditorDoc.getState().listSnapshots().then(setSnaps);

  const create = async () => {
    await useEditorDoc.getState().createSnapshot(label.trim() || undefined);
    setLabel('');
    await refresh();
    toast(t('snapshot.savedToast'));
  };

  const rollback = async (id: string) => {
    await useEditorDoc.getState().restoreSnapshot(id);
    await refresh();
    toast(t('snapshot.rollbackToast'));
    onClose();
  };

  const diff = selected && currentDoc ? alignBlockDiff(selected.doc, currentDoc) : null;

  return (
    <div className="guard-overlay" role="dialog" aria-modal="true" aria-label={t('snapshot.title')}>
      <div className="guard-box snapshot-box">
        <h2>{t('snapshot.title')}</h2>
        <div className="snap-save-row">
          <input
            className="snap-label-input"
            placeholder={t('snapshot.labelPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <button className="m-btn primary" onClick={() => void create()}>{t('snapshot.saveNow')}</button>
        </div>
        {snaps.length === 0 ? (
          <p className="muted">{t('snapshot.empty')}</p>
        ) : (
          <ul className="snap-list">
            {snaps.map((s) => (
              <li key={s.id} className={selected?.id === s.id ? 'on' : ''}>
                <button className="snap-pick" onClick={() => setSelected(s)}>
                  <span className="mono">{new Date(s.createdAt).toLocaleString()}</span>
                  <span className="muted"> · {t(`snapshot.trigger.${s.trigger}`)}</span>
                  {s.label && <span> · {s.label}</span>}
                </button>
                <button className="m-btn" onClick={() => void rollback(s.id)}>{t('snapshot.rollback')}</button>
              </li>
            ))}
          </ul>
        )}
        {selected && diff && (
          <div className="snap-compare">
            <div className="snap-diff-side">
              <h3>{t('snapshot.blockDiffs')}</h3>
              <ul className="snap-diff-list">
                {diff.items.filter((i) => i.status !== 'unchanged').map((i) => (
                  <li key={`${i.status}-${i.id}`} className={`diff-${STATUS_KEY[i.status]}`}>
                    <span className="sev-tag mono">{t(`snapshot.diff.${STATUS_KEY[i.status]}`)}</span>
                    <span className="kind mono">{t(`snapshot.kind.${i.kind}`)}</span>
                    <span className="lbl">{i.label || '—'}</span>
                  </li>
                ))}
                {diff.hasChanges === false && <li className="muted">{t('snapshot.noChanges')}</li>}
              </ul>
            </div>
            <div className="snap-panes">
              <div className="snap-pane">
                <h4>{t('snapshot.leftPane')}</h4>
                <CanvasEditor doc={selected.doc} onDocChange={() => {}} readOnly />
              </div>
              <div className="snap-pane">
                <h4>{t('snapshot.rightPane')}</h4>
                {currentDoc && <CanvasEditor doc={currentDoc} onDocChange={() => {}} readOnly />}
              </div>
            </div>
          </div>
        )}
        <div className="guard-actions">
          <button className="m-btn" onClick={onClose}>{t('closeGuard.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
