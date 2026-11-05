/**
 * 通用元信息对话框（#117）：页头与条目头共用。
 * 保存回调返回错误文案（保持对话框打开）或 null（成功关闭）。
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isComposingKey } from '../ime.js';

export interface MetaField {
  key: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
}

export interface MetaDialogProps {
  title: string;
  fields: MetaField[];
  onSave: (values: Record<string, string>) => string | null;
  onClose: () => void;
}

export function MetaDialog({ title, fields, onSave, onClose }: MetaDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isComposingKey(e)) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        setError(t('meta.required', { label: field.label }));
        return;
      }
    }
    const nextError = onSave(values);
    if (nextError) {
      setError(nextError);
      return;
    }
    onClose();
  };

  return createPortal(
    <div
      className="meta-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="meta-win" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {fields.map((field, index) => (
          <label className="meta-field" key={field.key}>
            <span>{field.label}</span>
            <input
              ref={index === 0 ? firstRef : undefined}
              value={values[field.key] ?? ''}
              placeholder={field.placeholder}
              aria-label={field.label}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </label>
        ))}
        {error && <p className="meta-error" role="alert">{error}</p>}
        <div className="meta-actions">
          <button type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="primary" onClick={submit}>{t('common.save')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
