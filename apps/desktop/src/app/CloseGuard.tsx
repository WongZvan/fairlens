import { useTranslation } from 'react-i18next';

/**
 * 关闭保护双模式弹窗（§5.7）。
 * mode 由 resolveGuardMode 判定：
 * - manual-dirty：手动模式有未保存 → 保存/不保存/取消
 * - unfinished：自动模式 flush 后仅剩未完成状态（AI 建议未采纳/导入向导/走查——m1.6 机制就位，真来源 m1.7/m4 接入）→ 丢弃并关闭/继续编辑
 * - merged：手动模式未保存 + 未完成并存 → 保存并关闭/直接关闭/取消，列明两类内容
 */
export type CloseGuardMode = 'manual-dirty' | 'unfinished' | 'merged';
export type CloseIntent = 'window-close' | 'back-library';

/** 未完成状态钩子（§5.7 保护钩子统一判定）；m1.6 无真实来源，返回空数组 */
export function collectPendingIssues(): string[] {
  return [];
}

export function resolveGuardMode(autosave: boolean, dirty: boolean, issues: string[]): CloseGuardMode | null {
  const unfinished = issues.length > 0;
  if (autosave) return unfinished ? 'unfinished' : null; // 自动模式：flush 后仅未完成态拦截
  if (dirty && unfinished) return 'merged';
  if (dirty) return 'manual-dirty';
  if (unfinished) return 'unfinished';
  return null;
}

export function CloseGuardDialog(props: {
  open: boolean;
  mode: CloseGuardMode;
  issues: string[];
  intent: CloseIntent;
  onSaveClose: () => void;
  onDiscardClose: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  if (!props.open) return null;
  const { mode, issues } = props;
  return (
    <div className="guard-overlay" role="dialog" aria-modal="true" aria-label={t('closeGuard.title')}>
      <div className="guard-box">
        <h2>{t('closeGuard.title')}</h2>
        {mode !== 'unfinished' && (
          <p className="muted">{t('closeGuard.unsavedNote')}</p>
        )}
        {issues.length > 0 && (
          <>
            <p className="muted">{t('closeGuard.issuesNote')}</p>
            <ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </>
        )}
        {mode === 'unfinished' && issues.length === 0 && (
          <p className="muted">{t('closeGuard.issuesEmpty')}</p>
        )}
        <div className="guard-actions">
          {mode === 'manual-dirty' && (
            <>
              <button className="m-btn primary" onClick={props.onSaveClose}>{t('closeGuard.saveClose')}</button>
              <button className="m-btn" onClick={props.onDiscardClose}>{t('closeGuard.discardClose')}</button>
              <button className="m-btn" onClick={props.onCancel}>{t('closeGuard.cancel')}</button>
            </>
          )}
          {mode === 'unfinished' && (
            <>
              <button className="m-btn primary" onClick={props.onSaveClose}>{t('closeGuard.continueEdit')}</button>
              <button className="m-btn" onClick={props.onDiscardClose}>{t('closeGuard.discardOnly')}</button>
            </>
          )}
          {mode === 'merged' && (
            <>
              <button className="m-btn primary" onClick={props.onSaveClose}>{t('closeGuard.saveClose')}</button>
              <button className="m-btn" onClick={props.onDiscardClose}>{t('closeGuard.discardClose')}</button>
              <button className="m-btn" onClick={props.onCancel}>{t('closeGuard.cancel')}</button>
            </>
          )}
        </div>
        <p className="muted small mono">{props.intent === 'back-library' ? t('closeGuard.toLibrary') : t('closeGuard.toExit')}</p>
      </div>
    </div>
  );
}
