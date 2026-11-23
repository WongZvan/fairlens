/**
 * 通用确认浮层（#127）：破坏性操作用（清空为空白简历 / 删除分区）。
 * 取代原生 window.confirm —— 原生弹窗无应用内样式、无焦点归还、层级不受控。
 * 走 Overlay 基座：Esc=取消、点遮罩=取消（不执行破坏动作）。
 */
import { useTranslation } from 'react-i18next';
import { Overlay } from './Overlay.js';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  /** 操作进行中：禁用两个按钮（#129 删除失败要留在框内可重试） */
  pending?: boolean;
  /** 失败信息：显示在框内，按钮恢复可点 */
  error?: string | null;
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, pending = false, error }: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      role="alertdialog"
      label={title}
      overlayClassName="guard-overlay"
      boxClassName="guard-box"
    >
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      {error && <p className="guard-error">{error}</p>}
      <div className="guard-actions">
        <button type="button" className="m-btn primary" disabled={pending} onClick={onConfirm}>
          {pending ? t('saveStatus.saving') : confirmLabel}
        </button>
        <button type="button" className="m-btn" disabled={pending} onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </Overlay>
  );
}
