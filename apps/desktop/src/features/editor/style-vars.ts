/**
 * 样式三维 → CSS 变量（m1.4）：manifest styleTokens 为默认，DocStyle 覆盖
 * 密度三档映射 --fl-line-height/entry-gap/section-gap（printCSS 约定）。
 */
import type { DocStyle, TemplateManifest } from '@fairlens/shared';

const DENSITY_MAP: Record<string, { line: string; entry: string; section: string }> = {
  compact: { line: '1.40', entry: '0.35em', section: '0.7em' },
  normal: { line: '1.55', entry: '0.6em', section: '1.1em' },
  loose: { line: '1.75', entry: '1em', section: '1.6em' },
};

export function styleToCssVars(tokens: TemplateManifest['styleTokens'] | undefined, style: DocStyle): Record<string, string> {
  const vars: Record<string, string> = {
    '--fl-heading': tokens?.fontHeading ?? 'Noto Serif SC',
    '--fl-body': tokens?.fontBody ?? 'Noto Serif SC',
    '--fl-accent': tokens?.accent ?? '#33518e',
  };
  // 密度：doc.style.density（auto→模板默认 normal）
  const density = style.density && style.density !== 'auto' ? style.density : 'normal';
  const d = DENSITY_MAP[density] ?? DENSITY_MAP.normal!;
  vars['--fl-line-height'] = d.line;
  vars['--fl-entry-gap'] = d.entry;
  vars['--fl-section-gap'] = d.section;

  // 字体主题覆盖（id → manifest.styleOptions.fontThemes）
  if (style.fontTheme && tokens) {
    vars['--fl-font-theme-applied'] = style.fontTheme; // 解析需 manifest 上下文，由调用方在模板数据就绪时替换
  }
  if (style.accent) vars['--fl-accent'] = style.accent;
  return vars;
}

/** 完整解析（含 fontTheme 查表）——manifest 可用时优先 */
export function resolveStyleVars(manifest: TemplateManifest | undefined, style: DocStyle): Record<string, string> {
  const vars = styleToCssVars(manifest?.styleTokens, style);
  if (manifest && style.fontTheme) {
    const theme = manifest.styleOptions.fontThemes.find((t) => t.id === style.fontTheme);
    if (theme) {
      vars['--fl-heading'] = theme.fonts.heading;
      vars['--fl-body'] = theme.fonts.body;
    }
  }
  delete vars['--fl-font-theme-applied'];
  return vars;
}
