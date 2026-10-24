import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../stores/license.js';

/**
 * 激活门（m1.1 打样；真验签+占席=m2.2/m2.3）。
 * v0.1 基线 §4.2：未激活=全屏门，无任何功能可用；通过后进入简历库。
 */
export function ActivationGate() {
  const { t } = useTranslation();
  const activate = useLicense((s) => s.activate);
  const [code, setCode] = useState('');
  const valid = /^FL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(code.trim().toUpperCase());

  return (
    <div className="gate">
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
        <button className="gate-btn" disabled={!valid} onClick={activate}>
          {t('gate.action')}
        </button>
        <p className="gate-hint muted">{t('gate.hint')}</p>
      </div>
    </div>
  );
}
