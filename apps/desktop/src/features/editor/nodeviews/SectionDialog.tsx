/**
 * 分区新增对话框（#121）：标题必填 + 类型（内置五类预设或自由输入）。
 * 结构与 MetaDialog 一致（同一套 meta-* 样式与 Esc/遮罩行为），额外带一个 type 下拉。
 * #128：标题前置为主路径；「类型标识」是内部规则键，收进「高级设置」，
 * 默认 custom、不展开也能保存——普通用户加「获奖经历」不需要理解英文键。
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BUILTIN_SECTION_TYPES } from '@fairlens/shared';
import { Overlay } from '../../../app/Overlay.js';

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

  const type = preset === 'custom' ? customType.trim() || 'custom' : preset;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return; // 契约 title min(1)：空标题不提交（按钮置灰）
    onSave({ type, title: trimmed });
    onClose();
  };

  return (
    <Overlay
      open
      onClose={onClose}
      label={t('editor.sectionAdd')}
      overlayClassName="meta-overlay"
      boxClassName="meta-win"
      initialFocusRef={titleRef}
    >
      <h3>{t('editor.sectionAdd')}</h3>
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
          <option value="custom">{t('editor.sectionTypeCustom')}</option>
          {BUILTIN_SECTION_TYPES.map((id) => (
            <option key={id} value={id}>
              {PRESET_TITLES[id]}
            </option>
          ))}
        </select>
      </label>
      <details className="meta-advanced">
        <summary>{t('editor.sectionAdvanced')}</summary>
        <label className="meta-field">
          <span>{t('editor.sectionTypeKey')}</span>
          <input
            value={customType}
            placeholder="custom"
            aria-label={t('editor.sectionTypeKey')}
            disabled={preset !== 'custom'}
            onChange={(e) => setCustomType(e.target.value)}
          />
        </label>
        <p className="meta-hint">{t('editor.sectionTypeKeyHint')}</p>
      </details>
      <div className="meta-actions">
        <button type="button" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="primary" disabled={!title.trim()} onClick={submit}>
          {t('common.save')}
        </button>
      </div>
    </Overlay>
  );
}
