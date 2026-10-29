import { Settings, ShieldCheck, SunMoon, SlidersHorizontal, Plug, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorDoc } from '../stores/editor-doc.js';

/**
 * 设置窗口壳（m1.1 打样；真功能=m2.3）。
 * 独立系统窗口形态（Windows 惯例）：居中浮层+遮罩，点遮罩/Esc 即关——
 * 永不占用主视图路由，关掉即回工作区（docs/01 §12.5「独立设置窗口」决策的打样呈现）。
 */
export function SettingsWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'activation' | 'appearance' | 'general' | 'llm' | 'about'>('appearance');
  // 注释承诺「点遮罩/Esc 即关」——补上 Esc（此前只实现了遮罩点击）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const nav: Array<{ id: typeof tab; label: string; icon: React.ReactNode }> = [
    { id: 'activation', label: t('settings.activation'), icon: <ShieldCheck size={15} /> },
    { id: 'appearance', label: t('settings.appearance'), icon: <SunMoon size={15} /> },
    { id: 'general', label: t('settings.general'), icon: <SlidersHorizontal size={15} /> },
    { id: 'llm', label: t('settings.llm'), icon: <Plug size={15} /> },
    { id: 'about', label: t('settings.about'), icon: <Info size={15} /> },
  ];
  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label={t('settings.title')} onClick={onClose}>
      <div className="settings-win" onClick={(e) => e.stopPropagation()}>
        <div className="settings-bar">
          <b>{t('settings.title')}</b>
          <span className="muted">{t(`settings.${tab}`)}</span>
          <span style={{ flex: 1 }} />
          <button className="settings-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
        <div className="settings-body">
          <nav className="settings-nav" aria-label={t('settings.title')}>
            {nav.map((n) => (
              <button
                key={n.id}
                className={n.id === tab ? 'on' : ''}
                onClick={() => setTab(n.id)}
                aria-current={n.id === tab ? 'page' : undefined}
              >
                {n.icon}{n.label}
              </button>
            ))}
          </nav>
          <div className="settings-pane">
            {tab === 'general' ? (
              <GeneralPane />
            ) : (
              <p className="muted">{t('settings.mockNote', { module: 'm2.3' })}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 通用页：自动保存开关（§5.7 双模式唯一的用户入口；真面板其余项仍归 m2.3） */
function GeneralPane() {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  return (
    <section>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={autosave}
          onChange={(e) => void useEditorDoc.getState().setAutosave(e.target.checked)}
        />
        <span>{t('settings.autosave')}</span>
      </label>
      <p className="muted small" style={{ marginTop: 6 }}>{t('settings.autosaveDesc')}</p>
    </section>
  );
}

/** 标题栏齿轮（把 M0 的 disabled 占位点亮为打样入口） */export function SettingsGear({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button aria-label={t('titlebar.settings')} title={t('titlebar.settings')} className="gear" onClick={onClick}>
      <Settings size={14} />
    </button>
  );
}
