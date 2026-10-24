import { ArrowLeft, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorMockup } from '../features/editor-mockup/EditorMockup.js';
import { useLicense } from '../stores/license.js';

/** 应用壳：标题栏 + 主区（路由骨架 library|editor；dev 面路由 m4/m5 懒加载挂载） */
export function AppShell() {
  const [view, setView] = useState<'library' | 'editor'>('library');
  return (
    <div className="shell">
      <TitleBarConnector onBack={view === 'editor' ? () => setView('library') : undefined} />
      {view === 'library' ? <LibraryPlaceholder onOpenMockup={() => setView('editor')} /> : <EditorMockup />}
      <StatusBar />
    </div>
  );
}

function TitleBarConnector({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="titlebar" data-tauri-drag-region>
      {onBack ? (
        <button className="back-btn" onClick={onBack} aria-label={t('nav.backLibrary')}>
          <ArrowLeft size={15} />
        </button>
      ) : (
        <span className="app mono" data-tauri-drag-region>FAIRLENS</span>
      )}
      <span className="muted file" data-tauri-drag-region>{t('status.m1')} · {t('license.unactivated')}</span>
      <span className="chip"><i className="dot ok" /> {t('titlebar.saved')}</span>
      <TitleButtons />
    </header>
  );
}

/** 窗口三键与主题循环（从 M0 TitleBar 迁入；isTauri 守卫 web 调试） */
function TitleButtons() {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const cycle = useThemeCycle();
  const isTauri = '__TAURI_INTERNALS__' in globalThis;
  const win = isTauri ? window.__TAURI__?.window?.getCurrentWindow() : undefined;
  const glyph = { light: '☀', dark: '☾', system: '🖥' }[mode];
  return (
    <div className="wbtns">
      <button aria-label={t('titlebar.theme', { theme: t(`theme.${mode}`) })} onClick={cycle} title={t(`theme.${mode}`)}>{glyph}</button>
      <button aria-label={t('titlebar.settings')} className="gear" disabled>⚙</button>
      {win && (
        <>
          <button aria-label={t('titlebar.windowMin')} onClick={() => void win.minimize()}>─</button>
          <button aria-label={t('titlebar.windowMax')} onClick={() => void win.toggleMaximize()}>□</button>
          <button aria-label={t('titlebar.windowClose')} className="close" onClick={() => void win.close()}>✕</button>
        </>
      )}
    </div>
  );
}

// 主题 hooks 薄封装（M0 的 useTheme 拆出只读选择器，避免标题栏重渲染整树）
import { useTheme } from '../stores/theme.js';
function useThemeMode() {
  return useTheme((s) => s.mode);
}
function useThemeCycle() {
  return useTheme((s) => s.cycle);
}

declare global {
  interface Window {
    __TAURI__?: { window?: { getCurrentWindow: () => { minimize(): Promise<void>; toggleMaximize(): Promise<void>; close(): Promise<void> } } };
  }
}

/** 简历库占位（m1.8 真实化；当前为打样入口） */
function LibraryPlaceholder({ onOpenMockup }: { onOpenMockup: () => void }) {
  const { t } = useTranslation();
  const activated = useLicense((s) => s.activated);
  return (
    <main className="library-empty">
      <h1>{t('library.title')}</h1>
      <p className="muted">{t('library.emptyHint')}</p>
      <button className="m-btn primary" style={{ marginTop: 8 }} onClick={onOpenMockup}>
        <FileText size={14} />{t('library.openMockup')}
      </button>
      <p className="muted small">{t('library.buildSoon')}</p>
      {!activated && <p className="muted small">{t('license.unactivated')}</p>}
    </main>
  );
}

/** 状态栏（M0 组件迁入文件以集中壳层） */
function StatusBar() {
  const { t } = useTranslation();
  return (
    <footer className="statusbar mono">
      <span className="online"><i className="dot ok" /> {t('status.online')}</span>
      <span className="muted">{t('status.commandHint')}</span>
    </footer>
  );
}
