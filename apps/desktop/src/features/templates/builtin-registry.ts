/**
 * builtin 模板注册表（m1.2）。
 * PackSource 抽象的 builtin 实现（docs/01 §2.4）：v0.1 仅此一源；
 * github-dist 源（dist/templates/ 签名包）在 m5.2 资源中心接入。
 *
 * 契约源=packages/shared/src/template.ts（TemplateManifest）——引用前去读源。
 */
import type { TemplateManifest } from '@fairlens/shared';
import { classicManifest, duoManifest, sidebarManifest } from './manifests/index.js';
import { classicCss, duoCss, sidebarCss } from './print-css/index.js';

export interface BuiltinTemplate {
  manifest: TemplateManifest;
  printCss: string;
}

const builtinTemplates: ReadonlyMap<string, BuiltinTemplate> = new Map([
  ['tpl-classic', { manifest: classicManifest, printCss: classicCss }],
  ['tpl-duo', { manifest: duoManifest, printCss: duoCss }],
  ['tpl-sidebar', { manifest: sidebarManifest, printCss: sidebarCss }],
]);

export function listBuiltinTemplates(): TemplateManifest[] {
  return [...builtinTemplates.values()].map((t) => t.manifest);
}

export function getBuiltinTemplate(id: string): BuiltinTemplate | undefined {
  return builtinTemplates.get(id);
}
