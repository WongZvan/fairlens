/**
 * 右键上下文菜单（#93，m1.5 补）：比 Ctrl+K 更自然的命令入口。
 * 两种光标态：
 *   - 空白处/条目上右键 → 结构命令（新起要点/复制条目/粘贴）
 *   - 选中文字右键      → 文字命令（加粗/斜体/链接/改写占位/复制）
 * Ctrl+K 面板保留为"搜索全部命令"兜底（§5.10 不变）。
 */
import { useMemo, useRef, useState } from 'react';

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
    // 防溢出：右/下边界回收
    const w = 220;
    const h = state.entries.length * 34 + 16;
    return {
      left: Math.min(state.x, window.innerWidth - w - 8),
      top: Math.min(state.y, window.innerHeight - h - 8),
    };
  }, [state]);

  if (!state || !pos) return null;
  return (
    <div
      className="ctx-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
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
