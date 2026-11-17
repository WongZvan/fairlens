/**
 * 命令栏下拉浮层（2026-11-17 修 #124 回归）
 *
 * 两个实证根因：
 *   1. `.cmdbar` 的 overflow:hidden 裁掉了 absolute 下拉——44px 高栏里只剩 12px 一条边，菜单"看不到"；
 *   2. portal 到 body 后，旧的「锚点 ref 是否包含 target」判定会把「点下拉项」误判成「点外面」：
 *      mousedown 先卸载下拉、click 随之丢失，菜单项点不动。dismiss 判定必须 = 锚点 ∪ 下拉节点。
 *
 * 定位：先 visibility:hidden 挂载量尺寸，useLayoutEffect 里算坐标再显示（paint 前完成，无闪跳）。
 * 纯函数 placeDropdown 与 DOM 解耦，单测锁住对齐/翻转/夹取规则。
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

export interface AnchorRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface DropSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface PlacementOptions {
  /** left=下拉左缘对齐锚点左缘；right=下拉右缘对齐锚点右缘（贴右边的按钮用） */
  align: 'left' | 'right';
  /** 与锚点的垂直间隙 */
  gap?: number;
  /** 与视口的留白 */
  margin?: number;
  /** 高度上限（沿用原 CSS 的 min(70vh, 520px) 量级） */
  maxHeightCap?: number;
  /** 下方至少这么多空间才优先落下，否则比较上方 */
  minSpaceBelow?: number;
}

export interface Placement {
  left: number;
  top: number;
  maxHeight: number;
  flipped: boolean;
}

const GAP = 4;
const MARGIN = 8;
const MAX_HEIGHT_CAP = 520;
const MIN_SPACE_BELOW = 180;

/** 视口内定位：水平夹取防越界；下方不够且上方更宽裕时翻转向上 */
export function placeDropdown(
  anchor: AnchorRect,
  size: DropSize,
  viewport: ViewportSize,
  opts: PlacementOptions,
): Placement {
  const gap = opts.gap ?? GAP;
  const margin = opts.margin ?? MARGIN;
  const cap = opts.maxHeightCap ?? MAX_HEIGHT_CAP;
  const minBelow = opts.minSpaceBelow ?? MIN_SPACE_BELOW;

  const rawLeft = opts.align === 'right' ? anchor.right - size.width : anchor.left;
  // 下拉比视口还宽时 maxLeft < margin，Math.max 兜底把左缘钉在 margin
  const left = Math.max(margin, Math.min(rawLeft, viewport.width - size.width - margin));

  const spaceBelow = viewport.height - anchor.bottom - gap - margin;
  const spaceAbove = anchor.top - gap - margin;
  const fitsBelow = spaceBelow >= Math.min(size.height, minBelow);
  // 下方不够且上方也不比下方宽裕时留在下方（翻转只会更差）
  const below = fitsBelow || spaceAbove <= spaceBelow;

  if (below) {
    return { left, top: anchor.bottom + gap, maxHeight: Math.max(0, Math.min(spaceBelow, cap)), flipped: false };
  }
  return {
    left,
    top: Math.max(margin, anchor.top - gap - size.height),
    maxHeight: Math.max(0, Math.min(spaceAbove, cap)),
    flipped: true,
  };
}

export interface DropdownProps {
  open: boolean;
  /** 定位锚点（触发按钮）：点它不算"点外面" */
  anchorRef: RefObject<HTMLElement>;
  align: 'left' | 'right';
  onClose: () => void;
  className?: string;
  role?: string;
  children: ReactNode;
}

export function Dropdown({
  open,
  anchorRef,
  align,
  onClose,
  className = 'cmd-drop',
  role,
  children,
}: DropdownProps) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null); // 重开时从"隐藏量尺寸"开始，避免拿旧 maxHeight 量出的高度做翻转判断
      return;
    }
    const place = () => {
      const anchor = anchorRef.current;
      const el = dropRef.current;
      if (!anchor || !el) return;
      setPlacement(
        placeDropdown(
          anchor.getBoundingClientRect(),
          { width: el.offsetWidth, height: el.offsetHeight },
          { width: window.innerWidth, height: window.innerHeight },
          { align },
        ),
      );
    };
    place();
    window.addEventListener('resize', place);
    // 捕获阶段：画布内滚动容器不算锚点位移，但外层滚动时一起跟
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (dropRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const style: CSSProperties = {
    left: placement?.left ?? 0,
    top: placement?.top ?? 0,
    maxHeight: placement?.maxHeight,
    visibility: placement ? 'visible' : 'hidden',
  };

  return createPortal(
    <div ref={dropRef} className={className} role={role} style={style}>
      {children}
    </div>,
    document.body,
  );
}
