/** 共享分区规则：五类分区的基础次序与上限（三套模板共用的骨架，个别模板可覆写） */
import type { TemplateManifest } from '@fairlens/shared';

export const baseSectionRules: TemplateManifest['sections'] = [
  { type: 'basic', order: 0, maxEntries: 1 },
  { type: 'education', order: 1, maxEntries: 4 },
  { type: 'experience', order: 2, maxEntries: 8 },
  { type: 'project', order: 3, maxEntries: 6 },
  { type: 'skill', order: 4, maxEntries: 1 },
];

/** 共享字体主题（v1.5 三维之一；宋/黑/组合 + 预览 Plex 正文，共 4 套=契约上限） */
export const sharedFontThemes: TemplateManifest['styleOptions']['fontThemes'] = [
  {
    id: 'serif',
    name: '宋体系',
    fonts: { heading: 'Noto Serif SC', body: 'Noto Serif SC' },
  },
  {
    id: 'sans',
    name: '黑体系',
    fonts: { heading: 'Microsoft YaHei', body: 'Microsoft YaHei' },
  },
  {
    id: 'mix',
    name: '组合系（衬线标题+黑体正文）',
    fonts: { heading: 'Noto Serif SC', body: 'Microsoft YaHei' },
  },
  {
    id: 'plex',
    name: '预览体（衬线标题+Plex 正文）',
    fonts: { heading: 'Noto Serif SC', body: 'IBM Plex Sans SC' },
  },
];

export const sharedDensities: TemplateManifest['styleOptions']['densities'] = ['compact', 'normal', 'loose'];
