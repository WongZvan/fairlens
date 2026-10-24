import { useTranslation } from 'react-i18next';

/** 状态栏（§12.3）：左端在线指示（M0 骨架态=在线）｜右端提示 */
export function StatusBar() {
  const { t } = useTranslation();
  return (
    <footer className="statusbar mono">
      <span className="online">
        <i className="dot ok" /> {t('status.online')}
      </span>
      <span className="muted">{t('status.commandHint')}</span>
    </footer>
  );
}
