import { Settings, ShieldCheck, SunMoon, SlidersHorizontal, Plug, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorDoc } from '../stores/editor-doc.js';
import { useLicense } from '../stores/license.js';

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
            ) : tab === 'activation' ? (
              <ActivationPane />
            ) : (
              <p className="muted">{t('settings.mockNote', { module: 'm2.3' })}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 激活管理页（#113 打样态）：显示本机激活记忆 + 重置（真验签/解绑=M2） */
function ActivationPane() {
  const { t } = useTranslation();
  const activated = useLicense((s) => s.activated);
  return (
    <section>
      <div className="settings-row">
        <span>{t('settings.activationState')}</span>
        <span className="muted">{activated ? t('settings.activatedMock') : t('settings.unactivatedMock')}</span>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>{t('settings.activationMockNote')}</p>
      <button
        className="m-btn"
        style={{ marginTop: 10 }}
        disabled={!activated}
        onClick={() => void useLicense.getState().reset()}
      >
        {t('settings.resetActivation')}
      </button>
    </section>
  );
}

/** 通用页：自动保存模式（自动/手动分段切换；#111 取代原来的复选框） */
function GeneralPane() {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  const setAutosave = (v: boolean) => void useEditorDoc.getState().setAutosave(v);
  return (
    <section>
      <div className="settings-row">
        <span>{t('settings.autosave')}</span>
        <div className="settings-seg" role="group" aria-label={t('settings.autosave')}>
          <button aria-pressed={autosave} onClick={() => setAutosave(true)}>{t('settings.autosaveAuto')}</button>
          <button aria-pressed={!autosave} onClick={() => setAutosave(false)}>{t('settings.autosaveManual')}</button>
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>{t('settings.autosaveDesc')}</p>
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
