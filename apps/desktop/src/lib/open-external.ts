/**
 * 系统默认浏览器打开外链（§5.2：Ctrl+点击链接 / 关于页外链）。
 * Tauri=opener 插件；web 调试=window.open 降级。
 */
export async function openExternal(url: string): Promise<void> {
  if (!/^(https?:|mailto:)/i.test(url)) return; // scheme 白名单双重保险
  if ('__TAURI_INTERNALS__' in globalThis) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
