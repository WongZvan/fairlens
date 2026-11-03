/**
 * 系统默认浏览器打开外链（§5.2：Ctrl+点击链接 / 关于页外链）。
 * Tauri=opener 插件（需 allow-open-url + allow-default-urls 作用域，否则 URL 会被拒）；
 * web 调试=window.open 降级。失败必须可见（不再静默）。
 */
export async function openExternal(url: string): Promise<void> {
  if (!/^(https?:|mailto:)/i.test(url)) return; // scheme 白名单双重保险
  try {
    if ('__TAURI_INTERNALS__' in globalThis) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch (err) {
    console.error('[openExternal] 打开链接失败', url, err);
    const { toast } = await import('../app/Toast.js');
    toast('打开链接失败：请检查系统默认浏览器设置');
  }
}
