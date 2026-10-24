import { useTranslation } from 'react-i18next';
import { useLicense } from '../stores/license.js';

/** 简历库占位（M0 骨架；真实首页=M1 m1.8，空态设计见 §5.1） */
export function LibraryPlaceholder() {
  const { t } = useTranslation();
  const activated = useLicense((s) => s.activated);
  return (
    <main className="library-empty">
      <h1>{t('library.title')}</h1>
      <p className="muted">{t('library.emptyHint')}</p>
      <p className="muted small">{t('library.buildSoon')}</p>
      {!activated && <p className="muted small">{t('license.unactivated')}</p>}
    </main>
  );
}
