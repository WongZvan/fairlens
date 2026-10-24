/**
 * 右键上下文菜单（#93，m1.5 补）：比 Ctrl+K 更自然的命令入口。
 * 两种光标态：
 *   - 空白处/条目上右键 → 结构命令（复制条目/粘贴）
 *   - 选中文字右键      → 悬浮工具条接管（B/I/链接）——两入口职责分离（#93）
 * 关闭惯例（Word/Web 右键）：点击菜单外任意处 / Esc 即关。
 */
import { useEffect, useMemo, useRef, useState } from 'react';

export interface ContextMenuItem {
  label: string;
  hint?: string;
  run: () => void;
  divider?: false;
}
export interface ContextMenuDivider {
  divider: true;
}
export type ContextMenuEntry = ContextMenuItem | ContextMenuDivider;

export interface ContextMenuState {
  x: number;
  y: number;
  entries: ContextMenuEntry[];
}

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const open = (x: number, y: number, entries: ContextMenuEntry[]) => setState({ x, y, entries });
  const close = () => setState(null);
  return { state, open, close };
}

export function ContextMenuView({ state, onClose }: { state: ContextMenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useMemo(() => {
    if (!state) return null;
    // 防溢出：右/下边界回收（宽度按收紧后的 190 估）
    const w = 190;
    const h = state.entries.length * 30 + 12;
    return {
      left: Math.min(state.x, window.innerWidth - w - 8),
      top: Math.min(state.y, window.innerHeight - h - 8),
    };
  }, [state]);

  // ② 点击菜单外任意处自动关闭（mousedown 捕获，早于其他处理）；Esc 亦可
  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ctx-menu')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown, { capture: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, { capture: true });
      document.removeEventListener('keydown', onKey);
    };
  }, [state, onClose]);

  if (!state || !pos) return null;
  return (
    <div className="ctx-menu" style={{ left: pos.left, top: pos.top }} role="menu" ref={ref}>
      {state.entries.map((entry, i) =>
        entry.divider ? (
          <div key={i} className="ctx-divider" />
        ) : (
          <button
            key={i}
            className="ctx-item"
            role="menuitem"
            onClick={() => {
              onClose();
              entry.run();
            }}
          >
            <span>{entry.label}</span>
            {entry.hint && <span className="ctx-hint mono">{entry.hint}</span>}
          </button>
        ),
      )}
    </div>
  );
}
