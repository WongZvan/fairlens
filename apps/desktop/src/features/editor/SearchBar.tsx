/**
 * 内联搜索条（2026-11-13，#126）：浮在画布顶部，输入即高亮、Enter 下一条、Shift+Enter 上一条、Esc 关闭。
 * 与命令栏同一套视觉语言（panel/line/accent 令牌），不抢纸面焦点。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { isComposingKey } from '../editor/ime.js';
import { matchLabel } from '../editor/search.js';

export interface SearchBarProps {
  open: boolean;
  /** 匹配计数（由 CanvasEditor 回传） */
  current: number;
  total: number;
  onQuery: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function SearchBar({ open, current, total, onQuery, onNext, onPrev, onClose }: SearchBarProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setValue('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="search-bar" role="dialog" aria-label={t('menu.editFind')}>
      <input
        ref={inputRef}
        value={value}
        placeholder={t('menu.editFind')}
        aria-label={t('menu.editFind')}
        onChange={(e) => {
          setValue(e.target.value);
          onQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (isComposingKey(e)) return; // IME 合成态：Enter/↑↓ 属于候选选择
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="search-count mono">{matchLabel(current, total)}</span>
      <button type="button" className="search-btn" aria-label={t('menu.editFind')} title="Shift+Enter" onClick={onPrev}>
        <ChevronUp size={13} strokeWidth={2.2} />
      </button>
      <button type="button" className="search-btn" aria-label={t('menu.editFind')} title="Enter" onClick={onNext}>
        <ChevronDown size={13} strokeWidth={2.2} />
      </button>
      <button type="button" className="search-btn" aria-label={t('common.close')} title="Esc" onClick={onClose}>
        <X size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
}