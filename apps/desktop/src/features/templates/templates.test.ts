import { describe, expect, it } from 'vitest';
import { TemplateManifest, validateDocStyleAgainstManifest } from '@fairlens/shared';
import { allManifests } from './manifests/index.js';
import { classicCss, duoCss, sidebarCss } from './print-css/index.js';
import { getBuiltinTemplate, listBuiltinTemplates } from './builtin-registry.js';

describe('m1.2 模板数据层', () => {
  it('三套 manifest 全部通过契约校验且 id 唯一', () => {
    const ids = new Set<string>();
    for (const m of allManifests) {
      expect(() => TemplateManifest.parse(m)).not.toThrow();
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
    }
    expect(ids).toEqual(new Set(['tpl-classic', 'tpl-duo', 'tpl-sidebar']));
  });

  it('照片槽模板声明制：仅 duo 声明 photo', () => {
    const duo = allManifests.find((m) => m.id === 'tpl-duo')!;
    const others = allManifests.filter((m) => m.id !== 'tpl-duo');
    expect(duo.optionalFields).toContain('photo');
    for (const m of others) expect(m.optionalFields).not.toContain('photo');
  });

  it('样式选项三维合法：fontThemes 2–4 / densities 三档 / accents ≤4 且 #RRGGBB', () => {
    for (const m of allManifests) {
      expect(m.styleOptions.fontThemes.length).toBeGreaterThanOrEqual(2);
      expect(m.styleOptions.fontThemes.length).toBeLessThanOrEqual(4);
      expect(m.styleOptions.densities).toContain('normal');
      expect(m.styleOptions.accents?.length).toBeLessThanOrEqual(4);
    }
  });

  it('DocStyle 越界拒绝（切换模板回落依据）：任意主题 accent 不属于第二套模板', () => {
    const classic = allManifests[0]!;
    const sidebar = allManifests[2]!;
    const sidebarOnlyAccent = sidebar.styleOptions.accents!.find((a) => !classic.styleOptions.accents!.includes(a))!;
    expect(validateDocStyleAgainstManifest(classic, { accent: sidebarOnlyAccent })).toEqual({ ok: false, reason: 'accent' });
    expect(validateDocStyleAgainstManifest(classic, { density: 'normal' })).toEqual({ ok: true });
  });

  it('printCSS 含 A4/分页纪律/--fl-* 变量组（三投影基石）', () => {
    for (const css of [classicCss, duoCss, sidebarCss]) {
      expect(css).toContain('size: A4');
      expect(css).toContain('break-inside: avoid');
      expect(css).toContain('--fl-heading');
      expect(css).toContain('--fl-accent');
      expect(css).toContain('--fl-line-height'); // 密度令牌
    }
  });

  it('布局变体特征：duo 含 grid 侧栏与照片槽；sidebar 含贯穿色条', () => {
    expect(duoCss).toMatch(/grid-template-columns: 58mm 1fr/);
    expect(duoCss).toContain('fl-photo-slot');
    expect(sidebarCss).toContain('width: 5mm');
  });

  it('builtin 注册表按 id 取模板（PackSource-builtin 位）', () => {
    expect(listBuiltinTemplates()).toHaveLength(3);
    expect(getBuiltinTemplate('tpl-classic')?.manifest.name).toBe('经典单栏');
    expect(getBuiltinTemplate('tpl-none')).toBeUndefined();
  });
});
