/**
 * 侧栏拖拽调宽（m1.5 用户需求）：面板内缘 6px 热区，光标 ↔，按住横向拉伸。
 * 宽度范围：左 150–320 / 右 220–420；localStorage 记忆（store setXxxWidth）。
 * 结构命令不挂——纯布局操作。
 */
import { useCallback, useEffect, useRef } from 'react';
import { useMockup } from '../../stores/mockup.js';

export function SidebarResizer({ side }: { side: 'left' | 'right' }) {
  const draggingRef = useRef(false);
  const setLeftWidth = useMockup((s) => s.setLeftWidth);
  const setRightWidth = useMockup((s) => s.setRightWidth);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      const startX = e.clientX;
      const startLeft = useMockup.getState().leftWidth;
      const startRight = useMockup.getState().rightWidth;

      const onMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const dx = ev.clientX - startX;
        if (side === 'left') setLeftWidth(startLeft + dx);
        else setRightWidth(startRight - dx); // 右栏拖左=变宽
      };
      const onUp = () => {
        draggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [side, setLeftWidth, setRightWidth],
  );

  // 拖拽期间释放捕获（鼠标快速移出热区不中断）
  useEffect(() => () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  return (
    <div
      className={`sidebar-resizer resizer-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'left' ? '拖拽调整大纲宽度' : '拖拽调整评估面板宽度'}
      onMouseDown={onMouseDown}
      title="拖拽调整宽度"
    />
  );
}
