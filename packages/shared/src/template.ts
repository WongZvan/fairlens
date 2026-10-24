import { z } from 'zod';
import { SECTION_TYPES } from './resume.js';

/** 分区规则：类型/顺序/条目上限（编辑器 gating 的依据） */
export const SectionRule = z.object({
  type: z.enum(SECTION_TYPES),
  order: z.number().int().nonnegative(),
  maxEntries: z.number().int().positive(),
});

/** 受控样式选项声明（§4.2）：字体主题 2–4 套 + 密度档 + 强调色板（可选） */
export const FontTheme = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fonts: z.object({ heading: z.string().min(1), body: z.string().min(1) }),
});

export const StyleOptions = z.object({
  fontThemes: z.array(FontTheme).min(1).max(4),
  densities: z.array(z.enum(['compact', 'normal', 'loose'])).min(1),
  accents: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(4).optional(),
});

export const TemplateManifest = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  thumbnail: z.string().min(1),
  version: z.number().int().positive(),
  sections: z.array(SectionRule).min(1),
  optionalFields: z.array(z.enum(['photo', 'links', 'pageBreak'])),
  styleOptions: StyleOptions,
  styleTokens: z.object({
    fontHeading: z.string(),
    fontBody: z.string(),
    accent: z.string(),
    spacing: z.string(),
    radius: z.string(),
  }),
  export: z.object({ printCssPath: z.string().min(1), docxGenerator: z.string().min(1) }),
});
export type TemplateManifest = z.infer<typeof TemplateManifest>;

/** DocStyle 值必须 ∈ 模板声明集（切模板回落 auto 的校验源） */
export function validateDocStyleAgainstManifest(
  manifest: z.infer<typeof TemplateManifest>,
  style: { fontTheme?: string; density?: string; accent?: string } | undefined,
): { ok: true } | { ok: false; reason: 'fontTheme' | 'density' | 'accent' } {
  if (!style) return { ok: true };
  if (style.fontTheme && !manifest.styleOptions.fontThemes.some((t) => t.id === style.fontTheme)) {
    return { ok: false, reason: 'fontTheme' };
  }
  if (style.density && style.density !== 'auto' && !manifest.styleOptions.densities.includes(style.density as 'compact')) {
    return { ok: false, reason: 'density' };
  }
  if (style.accent && !(manifest.styleOptions.accents ?? []).includes(style.accent)) {
    return { ok: false, reason: 'accent' };
  }
  return { ok: true };
}
