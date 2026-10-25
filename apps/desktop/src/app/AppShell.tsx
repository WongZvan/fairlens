import { ArrowLeft, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { ActivationGate } from './ActivationGate.js';
import { SettingsGear, SettingsWindow } from './SettingsWindow.js';
import { CloseGuardDialog, collectPendingIssues, resolveGuardMode, type CloseGuardMode, type CloseIntent } from './CloseGuard.js';
import { ToastHost } from './Toast.js';
import { EditorMockup } from '../features/editor-mockup/EditorMockup.js';
import { useEditorDoc } from '../stores/editor-doc.js';
import { useLicense } from '../stores/license.js';

/** 应用壳：标题栏 + 主区（路由骨架 library|editor；dev 面路由 m4/m5 懒加载挂载） */
export function AppShell() {
  const [view, setView] = useState<'library' | 'editor'>('library');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guard, setGuard] = useState<{ mode: CloseGuardMode; intent: CloseIntent } | null>(null);
  const activated = useLicense((s) => s.activated);
  const isTauri = '__TAURI_INTERNALS__' in globalThis;

  // m1.6：进入编辑器时对齐当前简历（最近编辑优先，空库建示例；选择逻辑 m1.8 库首页接管）
  useEffect(() => {
    if (view === 'editor' && activated) void useEditorDoc.getState().openCurrent();
  }, [view, activated]);

  const proceedClose = async (intent: CloseIntent) => {
    setGuard(null);
    if (intent === 'back-library') {
      setView('library');
      return;
    }
    if (isTauri) await getCurrentWindow().destroy(); // 放行关闭（绕过 onCloseRequested 钩子）
  };

  /** §5.7 关闭保护：save/discard=弹窗动作；无参=先 flush 再判定是否需要弹窗 */
  const requestClose = async (intent: CloseIntent, opts: { save?: boolean; discard?: boolean } = {}) => {
    const st = useEditorDoc.getState();
    if (opts.save) {
      await st.saveNow();
      await proceedClose(intent);
      return;
    }
    if (opts.discard) {
      st.discardPendingChanges();
      await proceedClose(intent);
      return;
    }
    await st.flushPending();
    const after = useEditorDoc.getState();
    const mode = resolveGuardMode(after.autosave, after.dirty, collectPendingIssues());
    if (!mode) {
      await proceedClose(intent);
      return;
    }
    setGuard({ mode, intent });
  };

  // §5.7 保护钩子①：窗口关闭请求统一拦截（web 模式退化为 beforeunload）
  useEffect(() => {
    if (!isTauri) {
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (useEditorDoc.getState().dirty) e.preventDefault();
      };
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void win
      .onCloseRequested(async (event) => {
        event.preventDefault(); // 一律先拦：flush + 保护判定后放行（proceedClose→destroy）
        await requestClose('window-close');
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, [isTauri]);

  // m1.6：窗口失焦立即保存（模块 MD 补录规格；仅自动模式——手动模式保持 Word 式语义）
  useEffect(() => {
    const onBlur = () => {
      const st = useEditorDoc.getState();
      if (st.autosave && st.ready) void st.flushPending();
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  if (!activated) {
    return <ActivationGate />; // 激活门=独立小窗形态（无主窗口 chrome：标题栏/状态栏/主题钮一概不出现）
  }
  return (
    <div className="shell">
      <TitleBarConnector
        onBack={view === 'editor' ? () => void requestClose('back-library') : undefined}
        onSettings={() => setSettingsOpen(true)}
      />
      {view === 'library' ? <LibraryPlaceholder onOpenMockup={() => setView('editor')} /> : <EditorMockup />}
      <StatusBar />
      <SettingsWindow open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ToastHost />
      <CloseGuardDialog
        open={!!guard}
        mode={guard?.mode ?? 'manual-dirty'}
        issues={collectPendingIssues()}
        intent={guard?.intent ?? 'back-library'}
        onSaveClose={() => guard && void requestClose(guard.intent, { save: true })}
        onDiscardClose={() => guard && void requestClose(guard.intent, { discard: true })}
        onCancel={() => setGuard(null)}
      />
    </div>
  );
}

function TitleBarConnector({ onBack, onSettings }: { onBack?: () => void; onSettings: () => void }) {
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
      <SaveStatusChip />
      <TitleButtons onSettings={onSettings} />
    </header>
  );
}

/** 标题栏保存状态 chip（m1.6 真实化：自动模式跟随状态机；手动模式跟随 dirty） */
function SaveStatusChip() {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  const status = useEditorDoc((s) => s.saveStatus);
  const dirty = useEditorDoc((s) => s.dirty);
  const label = autosave
    ? status === 'error'
      ? t('saveStatus.error')
      : status === 'pending' || status === 'saving'
        ? t('saveStatus.saving')
        : t('saveStatus.saved')
    : dirty
      ? t('saveStatus.unsaved')
      : t('saveStatus.saved');
  const warn = autosave ? status === 'error' : dirty;
  return (
    <span className="chip"><i className={warn ? 'dot warn' : 'dot ok'} /> {label}</span>
  );
}

/** 窗口三键与主题循环（从 M0 TitleBar 迁入；isTauri 守卫 web 调试）。
 * 窗口 API 走 npm 包（@tauri-apps/api）——withGlobalTauri 未启用，window.__TAURI__ 恒 undefined（m1.6 直报即修） */
function TitleButtons({ onSettings }: { onSettings: () => void }) {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const cycle = useThemeCycle();
  const isTauri = '__TAURI_INTERNALS__' in globalThis;
  const win = isTauri ? getCurrentWindow() : undefined;
  const glyph = { light: '☀', dark: '☾', system: '🖥' }[mode];
  return (
    <div className="wbtns">
      <button aria-label={t('titlebar.theme', { theme: t(`theme.${mode}`) })} onClick={cycle} title={t(`theme.${mode}`)}>{glyph}</button>
      <SettingsGear onClick={onSettings} />
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
  const activated = useLicense((s) => s.activated);
  return (
    <footer className="statusbar mono">
      <span className="lic">
        <i className={activated ? 'dot ok' : 'dot warn'} />
        {activated ? t('status.activated') : t('status.unactivated')}
      </span>
      <span className="muted">{t('status.commandHint')}</span>
    </footer>
  );
}
