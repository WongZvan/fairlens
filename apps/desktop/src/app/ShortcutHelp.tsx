/** 快捷键速查浮层（#127）：数据源 shortcut-list.ts；`?` 或视图菜单打开 */
import { useTranslation } from 'react-i18next';
import { Overlay } from './Overlay.js';
import { SHORTCUT_GROUPS } from './shortcut-list.js';

export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      label={t('shortcuts.title')}
      overlayClassName="guard-overlay"
      boxClassName="guard-box shortcut-box"
    >
      <h2>{t('shortcuts.title')}</h2>
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.titleKey} className="shortcut-group">
          <h3>{t(group.titleKey)}</h3>
          <dl>
            {group.items.map((item) => (
              <div className="shortcut-row" key={item.keys}>
                <dt className="mono">{item.keys}</dt>
                <dd>{t(item.labelKey)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <div className="guard-actions">
        <button type="button" className="m-btn" onClick={onClose}>{t('common.close')}</button>
      </div>
    </Overlay>
  );
}
