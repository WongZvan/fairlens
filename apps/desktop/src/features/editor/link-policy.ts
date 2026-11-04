/**
 * 链接 scheme 白名单（§9：注入面在 schema 层强制，不靠 UI 约束）。
 * 唯一事实源=docs/01 §5.2/§4.1 SafeHref：仅 http/https/mailto。
 * 该函数同时用于粘贴清洗与 Tiptap Link 的 isAllowedUri/shouldAutoLink。
 */
export const SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    return (SAFE_LINK_PROTOCOLS as readonly string[]).includes(url.protocol.toLowerCase());
  } catch {
    return false;
  }
}
