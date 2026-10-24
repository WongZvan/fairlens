/** 三套内置模板 manifest（m1.2；契约=TemplateManifest @fairlens/shared） */
import type { TemplateManifest } from '@fairlens/shared';
import { baseSectionRules, sharedDensities, sharedFontThemes } from './shared-parts.js';

/** 经典单栏：居中标题+横规线，最通用的求职版式 */
export const classicManifest: TemplateManifest = {
  id: 'tpl-classic',
  name: '经典单栏',
  thumbnail: 'classic.png',
  version: 1,
  sections: baseSectionRules,
  optionalFields: ['links'],
  styleOptions: {
    fontThemes: sharedFontThemes,
    densities: sharedDensities,
    accents: ['#33518E', '#2E6E4E', '#8A5A2B'],
  },
  styleTokens: {
    fontHeading: 'Noto Serif SC',
    fontBody: 'Noto Serif SC',
    accent: '#33518E',
    spacing: 'normal',
    radius: '2px',
  },
  export: { printCssPath: 'classic.css', docxGenerator: 'classic' },
};

/** 侧栏双栏：左信息栏（照片槽+基本+技能）+右主栏 */
export const duoManifest: TemplateManifest = {
  id: 'tpl-duo',
  name: '侧栏双栏',
  thumbnail: 'duo.png',
  version: 1,
  sections: baseSectionRules,
  optionalFields: ['photo', 'links', 'pageBreak'],
  styleOptions: {
    fontThemes: sharedFontThemes,
    densities: sharedDensities,
    accents: ['#33518E', '#4A4E69', '#2E5E4E'],
  },
  styleTokens: {
    fontHeading: 'Noto Serif SC',
    fontBody: 'Noto Serif SC',
    accent: '#33518E',
    spacing: 'normal',
    radius: '0px',
  },
  export: { printCssPath: 'duo.css', docxGenerator: 'duo' },
};

/** 强调色侧边：左窄色条贯穿（品牌感最强，适配设计/市场岗） */
export const sidebarManifest: TemplateManifest = {
  id: 'tpl-sidebar',
  name: '强调色侧边',
  thumbnail: 'sidebar.png',
  version: 1,
  sections: baseSectionRules,
  optionalFields: ['links', 'pageBreak'],
  styleOptions: {
    fontThemes: sharedFontThemes,
    densities: sharedDensities,
    accents: ['#33518E', '#7A4E8A', '#8A5A2B', '#2E5E4E'],
  },
  styleTokens: {
    fontHeading: 'Noto Serif SC',
    fontBody: 'Noto Serif SC',
    accent: '#33518E',
    spacing: 'normal',
    radius: '0px',
  },
  export: { printCssPath: 'sidebar.css', docxGenerator: 'sidebar' },
};

export const allManifests = [classicManifest, duoManifest, sidebarManifest];
