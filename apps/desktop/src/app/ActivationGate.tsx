import { KeyRound, Minus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useLicense } from '../stores/license.js';

/**
 * 激活门（m1.1 打样；真验签+占席=m2.2/m2.3）。
 * v0.1 基线 §4.2：未激活=全屏门，无任何功能可用；通过后进入简历库。
 * #110：按 #88 的 420×520 小窗形态（单窗近似）——门自带拖动区与最小化/关闭，窗口无边框时仍可操作。
 */
export function ActivationGate() {
  const { t } = useTranslation();
  const activate = useLicense((s) => s.activate);
  const [code, setCode] = useState('');
  const valid = /^FL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(code.trim().toUpperCase());
  const isTauri = '__TAURI_INTERNALS__' in globalThis;
  const win = isTauri ? getCurrentWindow() : undefined;
  const winCmd = (label: string, fn: () => Promise<void>) => () => {
    fn().catch((err) => console.error(`[window] ${label} failed`, err));
  };

  return (
    <div className="gate">
      <div className="gate-chrome" data-tauri-drag-region>
        <span style={{ flex: 1 }} data-tauri-drag-region />
        {win && (
          <>
            <button aria-label={t('titlebar.windowMin')} onClick={winCmd('最小化', () => win.minimize())}>
              <Minus size={14} strokeWidth={2} />
            </button>
            <button aria-label={t('titlebar.windowClose')} className="close" onClick={winCmd('关闭', () => win.close())}>
              <X size={15} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
      <div className="gate-body">
        <div className="gate-card">
          <div className="gate-logo mono">FAIRLENS</div>
          <h1>{t('gate.title')}</h1>
          <p className="muted">{t('gate.subtitle')}</p>
          <div className="gate-input">
            <KeyRound size={15} />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('gate.placeholder')}
              aria-label={t('gate.placeholder')}
              spellCheck={false}
              autoFocus
            />
          </div>
          <button className="gate-btn" disabled={!valid} onClick={() => void activate(code.trim().toUpperCase())}>
            {t('gate.action')}
          </button>
          <p className="gate-hint muted">{t('gate.hint')}</p>
        </div>
      </div>
    </div>
  );
}
