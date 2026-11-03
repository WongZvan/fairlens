/**
 * Ctrl/Meta+左键点击链接的判定（#111）：纯函数，便于单测。
 * 修复背景：原实现挂在 PM 的 handleClick 上，但该链路由 PM 内部鼠标序列驱动（合成/异常路径下不触发）；
 * 改为在 handleDOMEvents.mousedown 直接判定，行为可预期。
 */
export interface LinkClickLike {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  target: unknown;
}

export function hrefFromLinkMouseDown(e: LinkClickLike): string | null {
  if (e.button !== 0) return null;
  if (!(e.ctrlKey || e.metaKey)) return null;
  const el = e.target as { closest?: (sel: string) => { getAttribute?: (n: string) => string | null } | null } | null;
  const anchor = el?.closest?.('a[href]');
  const href = anchor?.getAttribute?.('href') ?? null;
  if (!href) return null;
  // scheme 白名单（与契约 SafeHref / openExternal 双重保险一致）
  return /^(https?:|mailto:)/i.test(href) ? href : null;
}
