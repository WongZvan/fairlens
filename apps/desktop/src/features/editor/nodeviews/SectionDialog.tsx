/**
 * 分区新增对话框（#121）：标题必填 + 类型（内置五类预设或自由输入）。
 * 结构与 MetaDialog 一致（同一套 meta-* 样式与 Esc/遮罩行为），额外带一个 type 下拉。
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BUILTIN_SECTION_TYPES } from '@fairlens/shared';
import { isComposingKey } from '../ime.js';

export interface SectionDraft {
  type: string;
  title: string;
}

/** 内置类型的默认标题（供下拉一键填入；用户可改） */
const PRESET_TITLES: Record<string, string> = {
  basic: '基本信息',
  education: '教育经历',
  experience: '实习经历',
  project: '项目经历',
  skill: '技能',
};

export function SectionDialog({
  onSave,
  onClose,
}: {
  onSave: (draft: SectionDraft) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  /** 内置类型选择；'custom' 时用 customType 的自由字符串 */
  const [preset, setPreset] = useState('custom');
  const [customType, setCustomType] = useState('custom');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isComposingKey(e)) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const type = preset === 'custom' ? customType.trim() || 'custom' : preset;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return; // 契约 title min(1)：空标题不提交（按钮置灰）
    onSave({ type, title: trimmed });
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
      <div className="meta-win" role="dialog" aria-modal="true" aria-label={t('editor.sectionAdd')}>
        <h3>{t('editor.sectionAdd')}</h3>
        <label className="meta-field">
          <span>{t('editor.sectionType')}</span>
          <select
            value={preset}
            onChange={(e) => {
              const next = e.target.value;
              setPreset(next);
              // 选内置类型且标题还空着 → 预填该类型默认标题（用户可改）
              if (next !== 'custom' && !title.trim()) setTitle(PRESET_TITLES[next] ?? '');
            }}
          >
            {BUILTIN_SECTION_TYPES.map((id) => (
              <option key={id} value={id}>
                {PRESET_TITLES[id]}
              </option>
            ))}
            <option value="custom">{t('editor.sectionTypeCustom')}</option>
          </select>
        </label>
        {preset === 'custom' && (
          <label className="meta-field">
            <span>{t('editor.sectionTypeKey')}</span>
            <input
              value={customType}
              placeholder="self-eval"
              aria-label={t('editor.sectionTypeKey')}
              onChange={(e) => setCustomType(e.target.value)}
            />
          </label>
        )}
        <label className="meta-field">
          <span>{t('editor.sectionTitle')}</span>
          <input
            ref={titleRef}
            value={title}
            placeholder={t('editor.sectionTitlePlaceholder')}
            aria-label={t('editor.sectionTitle')}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </label>
        <div className="meta-actions">
          <button type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="primary" disabled={!title.trim()} onClick={submit}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}