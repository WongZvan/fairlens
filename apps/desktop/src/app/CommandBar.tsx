/**
 * 单行命令栏（2026-11-13，#124）：标题栏 + 工具栏合并为一行 44px。
 *
 * 布局：`文件 编辑 视图 AI │ ↶ ↷ │ 模板：经典单栏 ▾` …… `保存  ⇅ 自动保存  导出 ▾  ● ☀ ⚙ ─ □ ✕`
 * 960×640 下净省 42px 画布（原 titlebar 42 + toolbar 44 = 86px 两行）。
 *
 * 未实现项一律 disabled + 里程碑徽标（菜单模型在 menu-model.ts，纯函数可单测）。
 * 菜单动作统一交给 AppShell 的 onAction —— 命令栏不碰编辑器实例（它可能不存在）。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, ChevronDown, Copy, Minus, Redo2, Square, Undo2, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEditorDoc } from '../stores/editor-doc.js';
import { useTheme } from '../stores/theme.js';
import { useLicense } from '../stores/license.js';
import { toast } from './Toast.js';
import { SettingsGear } from './SettingsWindow.js';
import { buildMenus, type MenuActionId, type MenuDef, type MenuItem } from './menu-model.js';

export interface CommandBarProps {
  view: 'library' | 'editor';
  onBack?: () => void;
  onSettings: () => void;
  /** 统一动作入口（含编辑器相关项；命令栏本身不持有 editor 实例） */
  onAction: (id: MenuActionId) => void;
  /** 导出进行中：禁用导出并显示进度文案 */
  exporting?: boolean;
}

/** 菜单开合：点开、移入切换、Esc 与点外关闭 */
function useMenus() {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [openId]);

  return {
    rootRef,
    openId,
    toggle: (id: string) => setOpenId((cur) => (cur === id ? null : id)),
    hover: (id: string) => setOpenId((cur) => (cur ? id : cur)),
    close: () => setOpenId(null),
  };
}

function MenuEntry({ item, run }: { item: MenuItem; run: (item: MenuItem) => void }) {
  return (
    <>
      {item.separatorBefore && <div className="cmd-sep" role="separator" />}
      {item.submenu ? <div className="cmd-group-label">{item.label}</div> : null}
      {!item.submenu && (
        <button
          type="button"
          role="menuitem"
          className="cmd-item"
          disabled={item.disabled}
          title={item.disabled ? item.badge : undefined}
          onClick={() => !item.disabled && run(item)}
        >
          <span className="cmd-item-label">{item.label}</span>
          {item.hint && <span className="cmd-item-hint">{item.hint}</span>}
          {item.badge && <span className="cmd-item-badge">{item.badge}</span>}
        </button>
      )}
      {item.submenu?.map((sub) => <MenuEntry key={`${sub.id}-${sub.label}`} item={sub} run={run} />)}
    </>
  );
}

function MenuButton({ menu, open, onToggle, onHover, run }: {
  menu: MenuDef;
  open: boolean;
  onToggle: () => void;
  onHover: () => void;
  run: (item: MenuItem) => void;
}) {
  return (
    <div className="cmd-menu" onMouseEnter={onHover}>
      <button type="button" className="cmd-menu-btn" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        {menu.label}
      </button>
      {open && (
        <div className="cmd-drop" role="menu">
          {menu.items.map((item) => <MenuEntry key={`${item.id}-${item.label}`} item={item} run={run} />)}
        </div>
      )}
    </div>
  );
}

/** 自动保存开关（Office 365 式）：与设置→通用双向同步 */
function AutosaveSwitch() {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  const label = autosave ? t('menu.autosaveOn') : t('menu.autosaveOff');
  return (
    <button
      type="button"
      className={`cmd-switch${autosave ? ' on' : ''}`}
      role="switch"
      aria-checked={autosave}
      aria-label={label}
      title={label}
      onClick={() => void useEditorDoc.getState().setAutosave(!autosave)}
    >
      <span className="cmd-switch-track" aria-hidden="true"><span className="cmd-switch-knob" /></span>
      <span className="cmd-switch-label">{label}</span>
    </button>
  );
}

const TEMPLATE_OPTIONS = [
  { id: 'tpl-classic', key: 'editor.tplClassic' },
  { id: 'tpl-duo', key: 'editor.tplDuo' },
  { id: 'tpl-sidebar', key: 'editor.tplSidebar' },
] as const;

/** 模板下拉（取代原三按钮分段控件：960px 下省 ~110px） */
function TemplatePicker() {
  const { t } = useTranslation();
  const templateId = useEditorDoc((s) => s.doc?.templateId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open]);

  const current = TEMPLATE_OPTIONS.find((tp) => tp.id === templateId) ?? TEMPLATE_OPTIONS[0];

  return (
    <div className="cmd-template" ref={ref}>
      <button
        type="button"
        className="cmd-template-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('editor.template')}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="muted">{t('editor.template')}：</span>
        {t(current.key)}
        <ChevronDown size={12} strokeWidth={2} />
      </button>
      {open && (
        <div className="cmd-drop cmd-drop-left" role="listbox">
          {TEMPLATE_OPTIONS.map((tp) => (
            <button
              type="button"
              key={tp.id}
              role="option"
              aria-selected={templateId === tp.id}
              className="cmd-item"
              onClick={() => {
                setOpen(false);
                const d = useEditorDoc.getState().doc;
                if (!d || d.templateId === tp.id) return;
                useEditorDoc.getState().applyDoc({ ...d, templateId: tp.id });
              }}
            >
              <span className="cmd-item-label">{t(tp.key)}</span>
              {templateId === tp.id && <Check size={12} strokeWidth={2.4} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommandBar({ view, onBack, onSettings, onAction, exporting }: CommandBarProps) {
  const { t } = useTranslation();
  const autosave = useEditorDoc((s) => s.autosave);
  const dirty = useEditorDoc((s) => s.dirty);
  const activated = useLicense((s) => s.activated);
  const themeMode = useTheme((s) => s.mode);
  const cycleTheme = useTheme((s) => s.cycle);
  const inEditor = view === 'editor';

  const menus = buildMenus(t, {
    inEditor,
    manualMode: !autosave,
    dirty,
    theme: themeMode,
    zoomMode: 'fit-width',
  });
  const { rootRef, openId, toggle, hover, close } = useMenus();
  const [exportOpen, setExportOpen] = useState(false);
  const isTauri = '__TAURI_INTERNALS__' in globalThis;
  const win = isTauri ? getCurrentWindow() : undefined;
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!win) return;
    let unlisten: (() => void) | undefined;
    void win.isMaximized().then(setMaximized).catch(() => {});
    void win.onResized(() => void win.isMaximized().then(setMaximized).catch(() => {})).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [win]);

  const winCmd = (label: string, fn: () => Promise<void>) => () => {
    fn().catch((err) => {
      console.error(`[window] ${label} failed`, err);
      toast(`窗口操作失败（${label}）：请截图上报`);
    });
  };

  const runItem = (item: MenuItem) => {
    close();
    onAction(item.id);
  };

  // 导出下拉复用「文件 → 导出」子菜单的定义（单一事实源，避免两处文案漂移）
  const exportItems = menus.find((m) => m.id === 'file')?.items.find((i) => i.submenu)?.submenu ?? [];

  return (
    <header className="cmdbar" data-tauri-drag-region>
      {onBack ? (
        <button className="back-btn" onClick={onBack} aria-label={t('nav.backLibrary')}>
          <ArrowLeft size={15} />
        </button>
      ) : (
        <span className="app mono" data-tauri-drag-region>FAIRLENS</span>
      )}

      <div className="cmd-menus" ref={rootRef}>
        {menus.map((menu) => (
          <MenuButton
            key={menu.id}
            menu={menu}
            open={openId === menu.id}
            onToggle={() => toggle(menu.id)}
            onHover={() => hover(menu.id)}
            run={runItem}
          />
        ))}
      </div>

      {/* 拖动区：菜单与图标之间的伸缩空白（data-tauri-drag-region 不落在按钮上） */}
      <span className="cmd-drag" data-tauri-drag-region />

      {inEditor && (
        <>
          <div className="cmd-icons">
            <button type="button" className="cmd-icon" aria-label={t('menu.editUndo')} title={t('menu.editUndo')} onClick={() => onAction('edit.undo')}>
              <Undo2 size={14} strokeWidth={2} />
            </button>
            <button type="button" className="cmd-icon" aria-label={t('menu.editRedo')} title={t('menu.editRedo')} onClick={() => onAction('edit.redo')}>
              <Redo2 size={14} strokeWidth={2} />
            </button>
          </div>
          <TemplatePicker />
        </>
      )}

      <span className="cmd-drag" data-tauri-drag-region />

      {inEditor && !autosave && (
        <button type="button" className="cmd-save" onClick={() => onAction('file.save')}>
          <span className={`dot ${dirty ? 'warn' : 'ok'}`} />
          {t('menu.fileSave')}
        </button>
      )}

      {inEditor && <AutosaveSwitch />}

      {inEditor && (
        <div className="cmd-export">
          <button
            type="button"
            className="cmd-export-btn"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            disabled={exporting}
            onClick={() => setExportOpen((o) => !o)}
          >
            {exporting ? t('menu.exporting') : t('menu.fileExport')}
            <ChevronDown size={12} strokeWidth={2} />
          </button>
          {exportOpen && (
            <div className="cmd-drop cmd-drop-right" role="menu">
              {exportItems.map((item) => (
                <MenuEntry
                  key={`${item.id}-${item.label}`}
                  item={{ ...item, disabled: item.disabled || exporting }}
                  run={(picked) => {
                    setExportOpen(false);
                    runItem(picked);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <span
        className={`cmd-activation${activated ? ' on' : ''}`}
        title={activated ? t('status.activated') : t('status.unactivated')}
        aria-label={activated ? t('status.activated') : t('status.unactivated')}
      />

      <div className="wbtns">
        <button aria-label={t('titlebar.theme', { theme: t(`theme.${themeMode}`) })} onClick={cycleTheme} title={t(`theme.${themeMode}`)}>
          {{ light: '☀', dark: '☾', system: '🖥' }[themeMode]}
        </button>
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
    </header>
  );
}