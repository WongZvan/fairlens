import { ArrowLeft, Copy, FileText, Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { useTranslation } from 'react-i18next';
import { ActivationGate } from './ActivationGate.js';
import { SettingsGear, SettingsWindow } from './SettingsWindow.js';
import { CloseGuardDialog, collectPendingIssues, resolveGuardMode, type CloseGuardMode, type CloseIntent } from './CloseGuard.js';
import { ToastHost, toast } from './Toast.js';
import { EditorMockup } from '../features/editor-mockup/EditorMockup.js';
import { useEditorDoc } from '../stores/editor-doc.js';
import { repairAllResumes } from '../lib/persistence/index.js';
import { saveChipState } from './save-status.js';
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

  // #109：激活后一次性修复历史坏数据（旧换序缺陷写入的 null 条目/空 runs）
  useEffect(() => {
    if (activated) void repairAllResumes();
  }, [activated]);

  // #110：激活门按 #88 的 420×520 小窗形态（单窗近似；真独立窗口=m2.3）
  useActivationWindowShape(activated, isTauri);

  const proceedClose = async (intent: CloseIntent) => {
    setGuard(null);
    if (intent === 'back-library') {
      setView('library');
      return;
    }
    if (isTauri) {
      try {
        await getCurrentWindow().destroy(); // 放行关闭（绕过 onCloseRequested 钩子）
      } catch (err) {
        // 权限/系统层失败必须可见——防再次出现"拦截后放不了行"的死局
        console.error('[window] destroy failed', err);
        toast('关闭窗口失败：请截图上报（可暂时用任务管理器退出）');
      }
    }
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

/** 顶栏激活状态（#111）：保留绿点+「已激活」；保存状态移到状态栏 */
function ActivationChip() {
  const { t } = useTranslation();
  const activated = useLicense((s) => s.activated);
  return (
    <span className="chip">
      <i className={activated ? 'dot ok' : 'dot warn'} />
      {activated ? t('status.activated') : t('status.unactivated')}
    </span>
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
      <span className="muted file" data-tauri-drag-region>{t('status.m1')}</span>
      <ActivationChip />
      <TitleButtons onSettings={onSettings} />
    </header>
  );
}

/** 激活门窗口形态（#110/#88）：未激活=420×520 小窗，激活后恢复 1280×800 并居中 */
function useActivationWindowShape(activated: boolean, isTauri: boolean) {
  useEffect(() => {
    if (!isTauri) return;
    const win = getCurrentWindow();
    void (async () => {
      try {
        if (activated) {
          await win.setMinSize(new LogicalSize(1152, 720));
          await win.setSize(new LogicalSize(1280, 800));
        } else {
          // 必须先放宽最小尺寸，否则 setSize 会被配置里的 minWidth 夹住
          await win.setMinSize(new LogicalSize(420, 520));
          await win.setSize(new LogicalSize(420, 520));
        }
        await win.center();
      } catch (err) {
        console.error('[window] 激活门窗口形态设置失败', err);
      }
    })();
  }, [activated, isTauri]);
}

/** 状态栏保存状态（#111 从顶栏移入；纯文字，无圆点；异常态警示色） */
function SaveStatusText() {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  const status = useEditorDoc((s) => s.saveStatus);
  const dirty = useEditorDoc((s) => s.dirty);
  const { key, warn } = saveChipState({ autosave, status, dirty });
  return <span className={warn ? 'save warn' : 'save'}>{t(`saveStatus.${key}`)}</span>;
}

/** 窗口三键与主题循环（从 M0 TitleBar 迁入；isTauri 守卫 web 调试）。
 * 窗口 API 走 npm 包（@tauri-apps/api）——withGlobalTauri 未启用，window.__TAURI__ 恒 undefined（m1.6 直报即修） */
function TitleButtons({ onSettings }: { onSettings: () => void }) {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const cycle = useThemeCycle();
  const isTauri = '__TAURI_INTERNALS__' in globalThis;
  const win = isTauri ? getCurrentWindow() : undefined;
  // 最大化/还原图标随窗口状态切换（#107）：初始化读 isMaximized，resize 事件同步
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!win) return;
    let unlisten: (() => void) | undefined;
    void win.isMaximized().then(setMaximized).catch(() => {});
    void win
      .onResized(() => {
        void win.isMaximized().then(setMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, [win]);
  const glyph = { light: '☀', dark: '☾', system: '🖥' }[mode];
  // 窗口命令失败必须可见（m1.6 缺陷教训：权限被拒曾静默失败=三键看似无效）
  const winCmd = (label: string, fn: () => Promise<void>) => () => {
    fn().catch((err) => {
      console.error(`[window] ${label} failed`, err);
      toast(`窗口操作失败（${label}）：请截图上报`);
    });
  };
  return (
    <div className="wbtns">
      <button aria-label={t('titlebar.theme', { theme: t(`theme.${mode}`) })} onClick={cycle} title={t(`theme.${mode}`)}>{glyph}</button>
      <SettingsGear onClick={onSettings} />
      {win && (
        <>
          <button aria-label={t('titlebar.windowMin')} onClick={winCmd('最小化', () => win.minimize())}><Minus size={14} strokeWidth={2} /></button>
          <button
            aria-label={maximized ? t('titlebar.windowRestore') : t('titlebar.windowMax')}
            onClick={winCmd(maximized ? '还原' : '最大化', () => win.toggleMaximize())}
          >
            {maximized ? <Copy size={13} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
          </button>
          <button aria-label={t('titlebar.windowClose')} className="close" onClick={winCmd('关闭', () => win.close())}><X size={15} strokeWidth={2} /></button>
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

/** 状态栏（M0 组件迁入文件以集中壳层；#111 保存状态显示在此） */
function StatusBar() {
  const { t } = useTranslation();
  return (
    <footer className="statusbar mono" data-tauri-drag-region>
      <SaveStatusText />
      <span className="muted">{t('status.commandHint')}</span>
    </footer>
  );
}
