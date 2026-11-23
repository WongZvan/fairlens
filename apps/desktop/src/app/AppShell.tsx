import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { Trans, useTranslation } from 'react-i18next';
import { docStats, formatCount } from '@fairlens/core';
import { ActivationGate } from './ActivationGate.js';
import { CommandBar } from './CommandBar.js';
import { SettingsWindow } from './SettingsWindow.js';
import { ShortcutHelp } from './ShortcutHelp.js';
import { CloseGuardDialog, collectPendingIssues, resolveGuardMode, type CloseGuardMode, type CloseIntent } from './CloseGuard.js';
import { ToastHost, toast } from './Toast.js';
import { EditorMockup } from '../features/editor-mockup/EditorMockup.js';
import { LibraryView } from '../features/library/LibraryView.js';
import { useEditorDoc } from '../stores/editor-doc.js';
import { persistence, repairAllResumes } from '../lib/persistence/index.js';
import { saveStatusView } from './save-status.js';
import { useLicense } from '../stores/license.js';
import { useMockup } from '../stores/mockup.js';
import { useTheme } from '../stores/theme.js';
import { dispatchEditorAction, type EditorActionId } from '../features/editor/editor-action-bus.js';
import { buildArchiveRecord, exportArchive, exportPdf, revealInFolder } from '../lib/export-service.js';
import { isNameMissing } from '../lib/export-guard.js';
import type { MenuActionId } from './menu-model.js';

/** 应用壳：标题栏 + 主区（路由骨架 library|editor；dev 面路由 m4/m5 懒加载挂载） */
export function AppShell() {
  const { t } = useTranslation();
  const [view, setView] = useState<'library' | 'editor'>('library');
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** #127：快捷键速查（视图菜单 / `?`） */
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [guard, setGuard] = useState<{ mode: CloseGuardMode; intent: CloseIntent } | null>(null);
  const activated = useLicense((s) => s.activated);
  const hydrated = useLicense((s) => s.hydrated);
  const isTauri = '__TAURI_INTERNALS__' in globalThis;

  // #113：启动先读回打样级激活记忆，避免每次重开都弹门
  useEffect(() => {
    void useLicense.getState().hydrate();
  }, []);

  // m1.8（#129）：编辑器由库页显式打开；这里不再自动选“最近一份”，更不播种示例
  const openResume = (id: string) => {
    void (async () => {
      const ok = await useEditorDoc.getState().openResume(id);
      if (ok) setView('editor');
      else toast(t('library.openFailed'));
    })();
  };

  // #109：激活后一次性修复历史坏数据（旧换序缺陷写入的 null 条目/空 runs）
  useEffect(() => {
    if (activated) void repairAllResumes();
  }, [activated]);

  // #110/#116：激活门按 420×380 小窗形态（单窗近似；真独立窗口=m2.3）；
  // 等 hydrate 完成后再应用，避免「门态 420 → 主窗」两个异步分支竞争把窗口顶在最小尺寸
  useActivationWindowShape(activated, hydrated, isTauri);
  // #112：最大化时取消圆角（贴合屏幕四角）
  useMaximizedClass(isTauri);

  /** #125：导出中（禁用导出项，防连点） */
  const [exporting, setExporting] = useState(false);
  /** #125：最近一次导出的文件路径（状态栏「打开所在文件夹」10 秒后自动消失） */
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  useEffect(() => {
    if (!lastExportPath) return;
    const timer = setTimeout(() => setLastExportPath(null), 10_000);
    return () => clearTimeout(timer);
  }, [lastExportPath]);

  /** 命令栏动作总线：全局项在此处理，编辑器项转发给 editor-action-bus */
  const handleAction = (id: MenuActionId) => {
    // —— 文件 / 窗口 ——
    if (id === 'file.save') {
      void useEditorDoc
        .getState()
        .saveNow()
        .then((r) => toast(r.ok ? t('titlebar.saved') : t('menu.saveFailed')));
      return;
    }
    if (id === 'file.back-library') {
      void requestClose('back-library');
      return;
    }
    // #127 二次打磨：文件菜单不再提供退出项（避免被误读为“关下拉”）；退出=标题栏 ✕ / Alt+F4
    if (id === 'file.new' || id === 'file.open') return; // 按钮已 disabled（m1.8）

    // —— 导出（#125）——
    if (id === 'file.export-pdf' || id === 'file.export-archive') {
      if (exporting) return;
      setExporting(true);
      void (async () => {
        try {
          const st = useEditorDoc.getState();
          const name = st.doc?.profile?.name;
          // #128：姓名未填不导出（空白简历在数据层是空串，不编造「你的姓名」）
          if (isNameMissing(name)) {
            toast(t('editor.nameRequired'));
            return;
          }
          if (!isTauri) {
            toast(t('menu.archiveNotInTauri'));
            return;
          }
          if (id === 'file.export-pdf') {
            // PrintToPdf 打印的是实时 DOM，无需先落盘；姓名已在上面校验
            const result = await exportPdf(name);
            if (!result) return; // 用户取消
            if (result.ok && result.path) {
              toast(t('menu.exportPdfDone'));
              setLastExportPath(result.path);
            } else {
              toast(t('menu.exportFailed', { reason: result.error ?? '' }));
            }
            return;
          }
          // 归档：正文用**当前文档**（不是库里的行——防读到防抖前的旧版本），
          // 行只提供元数据；快照仍从库读。
          const resumeId = st.resumeId;
          const doc = st.doc;
          if (!resumeId || !doc) {
            toast(t('menu.exportFailed', { reason: '简历记录不存在' }));
            return;
          }
          const [row, snaps] = await Promise.all([
            persistence().getResume(resumeId),
            persistence().listSnapshots(resumeId),
          ]);
          if (!row) {
            toast(t('menu.exportFailed', { reason: '简历记录不存在' }));
            return;
          }
          const payload = buildArchiveRecord({
            resume: {
              id: row.id,
              title: st.resumeTitle ?? row.title,
              verticalId: row.verticalId,
              doc,
              status: row.status,
            },
            snapshots: snaps,
          });
          const result = await exportArchive(payload, name);
          if (!result) return;
          if (result.ok && result.path) {
            toast(t('menu.exportArchiveDone'));
            setLastExportPath(result.path);
          } else {
            toast(t('menu.exportFailed', { reason: result.error ?? '' }));
          }
        } finally {
          setExporting(false);
        }
      })();
      return;
    }

    // —— 视图 / 主题 ——
    if (id === 'view.toggle-left') return void useMockup.getState().toggleLeft();
    if (id === 'view.toggle-right') return void useMockup.getState().toggleRight();
    if (id === 'view.zoom-fit-width') return void useMockup.getState().setZoomMode('fit-width');
    if (id === 'view.zoom-fit-page') return void useMockup.getState().setZoomMode('fit-page');
    if (id === 'view.zoom-100') return void useMockup.getState().setZoomMode(1);
    if (id === 'view.theme-light') return void useTheme.getState().setMode('light');
    if (id === 'view.theme-dark') return void useTheme.getState().setMode('dark');
    if (id === 'view.theme-system') return void useTheme.getState().setMode('system');
    if (id === 'view.shortcuts') {
      setShortcutsOpen(true);
      return;
    }

    // —— 编辑器项（undo/redo/粘贴/查找/快照/分区）——
    if (!dispatchEditorAction(id as EditorActionId)) {
      toast(t('status.editorNotReady'));
    }
  };

  // #127：`?` 打开快捷键速查（输入框/正文/浮层内不抢键）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.isComposing) return; // 中文输入法组合态不抢键
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && (target.closest('input, textarea, select') || target.isContentEditable)) return;
      if (document.querySelector('[data-overlay-open]')) return;
      e.preventDefault();
      setShortcutsOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      const saved = await st.saveNow();
      // #127：保存失败时不放行关闭——重新弹保护框，让用户重试或明确选择"仍然关闭"
      if (!saved.ok) {
        setGuard({ mode: 'save-error', intent });
        return;
      }
      await proceedClose(intent);
      return;
    }
    if (opts.discard) {
      st.discardPendingChanges();
      await proceedClose(intent);
      return;
    }
    const flushed = await st.flushPending();
    const after = useEditorDoc.getState();
    const saveError = !flushed.ok || after.saveStatus === 'error';
    const mode = resolveGuardMode(after.autosave, after.dirty, collectPendingIssues(), saveError);
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

  if (!hydrated) {
    // 激活记忆读回前的极简占位（避免先闪门再跳主壳）
    return (
      <div className="gate">
        <div className="gate-body"><p className="muted">正在启动…</p></div>
      </div>
    );
  }
  if (!activated) {
    return <ActivationGate />; // 激活门=独立小窗形态（无主窗口 chrome：标题栏/状态栏/主题钮一概不出现）
  }
  return (
    <div className="shell">
      <CommandBar
        view={view}
        onBack={view === 'editor' ? () => void requestClose('back-library') : undefined}
        onSettings={() => setSettingsOpen(true)}
        onAction={handleAction}
        exporting={exporting}
      />
      {view === 'library' ? <LibraryView onOpen={openResume} /> : <EditorMockup />}
      <StatusBar
        view={view}
        lastExportPath={lastExportPath}
        onReveal={() => lastExportPath && void revealInFolder(lastExportPath)}
        onShortcuts={() => setShortcutsOpen(true)}
      />
      <SettingsWindow open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShortcutHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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

/** #112：把窗口最大化状态写到 <html data-maximized>，供 CSS 取消圆角 */
function useMaximizedClass(isTauri: boolean) {
  useEffect(() => {
    if (!isTauri) return;
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    const sync = () => {
      void win
        .isMaximized()
        .then((m) => {
          document.documentElement.dataset.maximized = m ? 'true' : 'false';
        })
        .catch(() => {});
    };
    sync();
    void win.onResized(sync).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [isTauri]);
}

/** 激活门窗口形态（#110/#112/#116）：未激活=420×380 小窗，激活后恢复 1280×800 并居中 */
function useActivationWindowShape(activated: boolean, hydrated: boolean, isTauri: boolean) {
  useEffect(() => {
    if (!isTauri || !hydrated) return;
    const win = getCurrentWindow();
    void (async () => {
      try {
        if (activated) {
          await win.setMinSize(new LogicalSize(960, 640));
          await win.setSize(new LogicalSize(1280, 800));
        } else {
          // 必须先放宽最小尺寸，否则 setSize 会被配置里的 minWidth 夹住
          await win.setMinSize(new LogicalSize(420, 380));
          await win.setSize(new LogicalSize(420, 380));
        }
        await win.center();
      } catch (err) {
        console.error('[window] 激活门窗口形态设置失败', err);
      }
    })();
  }, [activated, hydrated, isTauri]);
}

/** 状态栏保存指示（#112）：圆点=模式（绿自动/红手动），文字=模式 + 即时状态；#127 失败可重试 */
function SaveStatusText() {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  const status = useEditorDoc((s) => s.saveStatus);
  const dirty = useEditorDoc((s) => s.dirty);
  const view = saveStatusView({ autosave, status, dirty });
  return (
    <span className={view.warn ? 'save warn' : 'save'}>
      <i className={`dot ${view.dot}`} />
      <span className="save-mode">{t(`saveStatus.${view.modeKey}`)}</span>
      <span className="save-sep">·</span>
      <span className="save-state">{t(`saveStatus.${view.stateKey}`)}</span>
      {status === 'error' && (
        <button
          type="button"
          className="statusbar-action"
          onClick={() => {
            void useEditorDoc
              .getState()
              .saveNow()
              .then((r) => toast(r.ok ? t('titlebar.saved') : t('menu.saveFailed')));
          }}
        >
          {t('saveStatus.retry')}
        </button>
      )}
    </span>
  );
}

/** 状态栏（M0 组件迁入文件以集中壳层；#111 保存状态显示在此；#124 加字数统计；#125 加导出回执） */
function StatusBar({ view, lastExportPath, onReveal, onShortcuts }: {
  view: 'library' | 'editor';
  lastExportPath: string | null;
  onReveal: () => void;
  onShortcuts: () => void;
}) {
  const { t } = useTranslation();
  const doc = useEditorDoc((s) => s.doc);
  const stats = docStats(doc);
  const inEditor = view === 'editor';
  return (
    <footer className="statusbar" data-tauri-drag-region>
      {/* #128：保存状态/字数属于编辑器；库页显示它们会让人以为库里有这张卡 */}
      {inEditor && (
        <>
          <SaveStatusText />
          <span className="muted stats" title={t('menu.docStats', { chars: stats.chars, bullets: stats.bullets })}>
            <Trans
              i18nKey="menu.docStatsRich"
              values={{ chars: formatCount(stats.chars), bullets: formatCount(stats.bullets) }}
              components={{ n: <span className="num" /> }}
            />
          </span>
        </>
      )}
      {inEditor && lastExportPath && (
        <button type="button" className="statusbar-action" onClick={onReveal}>
          {t('menu.openFolder')}
        </button>
      )}
      {/* #127 四次打磨：只留 `?` 键帽（点击开速查表）——文字说明在 tooltip/aria 里 */}
      {inEditor && (
        <button
          type="button"
          className="statusbar-help"
          style={{ marginLeft: 'auto' }}
          onClick={onShortcuts}
          title={t('status.shortcutHelpTitle')}
          aria-label={t('status.shortcutHelpTitle')}
        >
          ?
        </button>
      )}
    </footer>
  );
}
