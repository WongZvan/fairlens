/**
 * 浮层基座（#127，R1 浮层契约）。
 *
 * 统一四件事，避免每个对话框各写一套（审计发现 5 种退出实现、2 个对话框按 Esc 没反应）：
 * 1. 点遮罩关闭（mousedown + target===currentTarget：面板内拖选文字松手到遮罩上不误关）；
 * 2. Esc 关闭（IME 合成态不拦；CloseGuard 用 closeOnBackdrop=false + Esc=取消）；
 * 3. 关闭后焦点归还给打开前的元素（编辑器/触发按钮），否则关掉面板后直接打字没有反应；
 * 4. 焦点陷阱 + `data-overlay-open` 标记（供全局快捷键守卫判断）。
 *
 * 浮层内容一律渲染在 `.overlay-class` 遮罩内的 `.box-class` 盒子里，
 * role/aria-modal 挂在盒子上（不是遮罩上）——读屏听到的是对话框本身而不是整个视口。
 */
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** 默认 true；破坏性确认（关闭保护）传 false——误点遮罩代价是丢数据 */
  closeOnBackdrop?: boolean;
  /** 打开后聚焦的元素；缺省聚焦盒子内第一个可聚焦元素 */
  initialFocusRef?: RefObject<HTMLElement>;
  role?: 'dialog' | 'alertdialog';
  /** aria-label（浮层标题） */
  label: string;
  overlayClassName: string;
  boxClassName: string;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Overlay({
  open,
  onClose,
  closeOnBackdrop = true,
  initialFocusRef,
  role = 'dialog',
  label,
  overlayClassName,
  boxClassName,
  children,
}: OverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);

  // 记录打开前的焦点，关闭时归还（只在焦点已经掉到 body 时归还，不抢用户后来点的位置）
  useLayoutEffect(() => {
    if (!open) return;
    returnRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const prev = returnRef.current;
      const active = document.activeElement;
      if (prev && prev.isConnected && (active === document.body || active === null)) prev.focus();
    };
  }, [open]);

  // 初始焦点：优先指定元素，其次盒子内第一个可聚焦元素，最后盒子自身
  useEffect(() => {
    if (!open) return;
    const target = initialFocusRef?.current ?? boxRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (target) {
      target.focus();
      if (target instanceof HTMLInputElement) target.select();
    } else {
      boxRef.current?.focus();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.isComposing) return; // 中文输入法取消候选不关浮层
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const nodes = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // portal 到 body：纸面有 zoom transform，浮层留在画布子树里会坐标错算（m1.5 工具条同一教训）
  return createPortal(
    <div
      ref={overlayRef}
      className={overlayClassName}
      data-overlay-open="true"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={boxRef} className={boxClassName} role={role} aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
