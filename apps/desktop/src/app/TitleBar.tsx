import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../stores/theme.js';

/** @tauri-apps/api 可用性守卫：web 调试模式下窗口控制降级隐藏（M0 无 Rust 依赖可跑） */
const isTauri = '__TAURI_INTERNALS__' in globalThis;

/** 标题栏（§12.5）：FAIRLENS Mono 字标｜主题三态循环｜齿轮｜窗口三键 */
export function TitleBar() {
  const { t } = useTranslation();
  const mode = useTheme((s) => s.mode);
  const cycle = useTheme((s) => s.cycle);
  const win = isTauri ? getCurrentWindow() : null;

  const modeGlyph = { light: '☀', dark: '☾', system: '🖥' }[mode];

  return (
    <header className="titlebar" data-tauri-drag-region>
      <span className="app mono" data-tauri-drag-region>
        FAIRLENS
      </span>
      <span className="muted file" data-tauri-drag-region>
        {t('status.m0')} · {t('license.unactivated')}
      </span>
      <span className="chip">
        <i className="dot ok" /> {t('titlebar.saved')}
      </span>
      <div className="wbtns">
        <button aria-label={t('titlebar.theme', { theme: t(`theme.${mode}`) })} onClick={cycle} title={t(`theme.${mode}`)}>
          {modeGlyph}
        </button>
        <button aria-label={t('titlebar.settings')} className="gear" disabled>
          ⚙
        </button>
        {win && (
          <>
            <button aria-label={t('titlebar.windowMin')} onClick={() => void win.minimize()}>─</button>
            <button aria-label={t('titlebar.windowMax')} onClick={() => void win.toggleMaximize()}>□</button>
            <button aria-label={t('titlebar.windowClose')} className="close" onClick={() => void win.close()}>✕</button>
          </>
        )}
      </div>
    </header>
  );
}
