/**
 * 命令面板（m1.5）：Ctrl+K 无选区唤起；模糊搜索；Esc 关闭；↑↓ 选择 Enter 执行。
 * 命令源=commandRegistry（devOnly 由 license 角色门控）。
 */
import { CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../../stores/license.js';
import { commandRegistry, type CommandDef } from '../editor/command-registry.js';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDev = useLicense((s) => s.role === 'dev');

  const results = useMemo(() => commandRegistry.search(query, isDev), [query, isDev]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const run = (cmd: CommandDef) => {
    onClose();
    cmd.run();
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label={t('palette.title')} onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={15} />
          <input
            ref={inputRef}
            value={query}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.placeholder')}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && results[active]) run(results[active]);
            }}
          />
        </div>
        <ul className="palette-list" role="listbox">
          {results.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'on' : ''}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
            >
              <span>{c.title}</span>
              {c.hint && <span className="muted mono">{c.hint}</span>}
              {i === active && <CornerDownLeft size={13} className="enter" />}
            </li>
          ))}
          {results.length === 0 && <li className="muted empty">{t('palette.empty')}</li>}
        </ul>
      </div>
    </div>
  );
}
