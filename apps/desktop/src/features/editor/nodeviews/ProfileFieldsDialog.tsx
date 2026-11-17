/**
 * 页头编辑对话框（#122）：三项固定字段 + 可自由增删的附加字段列表。
 * #127：与 MetaDialog 同风格（Overlay 退出契约），并补 Enter 提交（此前全部输入无 Enter）。
 */
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Overlay } from '../../../app/Overlay.js';
import { nanoid } from '../../../lib/nanoid.js';

export interface ProfileDraft {
  name: string;
  headline: string;
  contactLine: string;
  fields: Array<{ id: string; label: string; value: string; href?: string }>;
}

export function ProfileFieldsDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: ProfileDraft;
  onSave: (draft: ProfileDraft) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [contactLine, setContactLine] = useState(initial.contactLine);
  const [fields, setFields] = useState(initial.fields);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<{ label: string; value: string; href: string }>) => {
    setFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const submit = () => {
    if (!name.trim()) {
      setError(t('meta.required', { label: t('editor.name') }));
      return;
    }
    // label 空的行视为用户没填，直接丢掉（契约 label min(1)）
    const cleaned = fields
      .map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim(), href: f.href?.trim() }))
      .filter((f) => f.label)
      .map((f) => ({ id: f.id, label: f.label, value: f.value, ...(f.href ? { href: f.href } : {}) }));
    onSave({ name: name.trim(), headline: headline.trim(), contactLine: contactLine.trim(), fields: cleaned });
    onClose();
  };

  /** Enter 提交（IME 合成态交给输入法） */
  const enterSubmit = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Overlay
      open
      onClose={onClose}
      label={t('editor.profileTitle')}
      overlayClassName="meta-overlay"
      boxClassName="meta-win"
      initialFocusRef={firstRef}
    >
      <h3>{t('editor.profileTitle')}</h3>
      <label className="meta-field">
        <span>{t('editor.name')}</span>
        <input ref={firstRef} value={name} aria-label={t('editor.name')} onChange={(e) => setName(e.target.value)} onKeyDown={enterSubmit} />
      </label>
      <label className="meta-field">
        <span>{t('editor.headline')}</span>
        <input value={headline} aria-label={t('editor.headline')} onChange={(e) => setHeadline(e.target.value)} onKeyDown={enterSubmit} />
      </label>
      <label className="meta-field">
        <span>{t('editor.contact')}</span>
        <input value={contactLine} aria-label={t('editor.contact')} onChange={(e) => setContactLine(e.target.value)} onKeyDown={enterSubmit} />
      </label>

      <div className="meta-subhead">
        <span>{t('editor.profileExtraFields')}</span>
        <button
          type="button"
          className="meta-add"
          onClick={() => setFields((list) => [...list, { id: nanoid(), label: '', value: '' }])}
        >
          <Plus size={12} />{t('editor.addField')}
        </button>
      </div>
      {fields.map((field) => (
        <div className="meta-row" key={field.id}>
          <input
            value={field.label}
            placeholder={t('editor.fieldLabel')}
            aria-label={t('editor.fieldLabel')}
            onChange={(e) => update(field.id, { label: e.target.value })}
            onKeyDown={enterSubmit}
          />
          <input
            value={field.value}
            placeholder={t('editor.fieldValue')}
            aria-label={t('editor.fieldValue')}
            onChange={(e) => update(field.id, { value: e.target.value })}
            onKeyDown={enterSubmit}
          />
          <input
            value={field.href ?? ''}
            placeholder="https://"
            aria-label={t('editor.fieldHref')}
            onChange={(e) => update(field.id, { href: e.target.value })}
            onKeyDown={enterSubmit}
          />
          <button
            type="button"
            className="meta-del"
            aria-label={t('editor.removeField')}
            onClick={() => setFields((list) => list.filter((f) => f.id !== field.id))}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {error && <p className="meta-error" role="alert">{error}</p>}
      <div className="meta-actions">
        <button type="button" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="primary" onClick={submit}>{t('common.save')}</button>
      </div>
    </Overlay>
  );
}