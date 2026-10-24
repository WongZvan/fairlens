/** 三套模板的 printCSS 变体（m1.2）：base + 布局差异层 */
import { printCssBase } from './base.js';

/** 经典单栏：居中头部+横规线 */
export const classicCss = printCssBase + `
.fl-head { text-align: left; border-bottom: 2.5px solid var(--fl-accent); padding-bottom: 0.5em; }
.fl-head .name-line { display: flex; align-items: baseline; gap: 0.8em; flex-wrap: wrap; }
.fl-head .intent { color: #5a5955; font-size: 10pt; }
`;

/** 侧栏双栏：grid 左栏（信息/技能/照片槽）+右主栏 */
export const duoCss = printCssBase + `
.fl-paper { display: grid; grid-template-columns: 58mm 1fr; gap: 0 8mm; padding: 0; }
.fl-side {
  background: color-mix(in srgb, var(--fl-accent) 6%, #fff);
  border-right: 1px solid color-mix(in srgb, var(--fl-accent) 18%, #ddd);
  padding: var(--fl-margin) 6mm var(--fl-margin) 7mm;
}
.fl-main { padding: var(--fl-margin) 7mm var(--fl-margin) 0; }
.fl-head { grid-column: 1 / -1; padding: var(--fl-margin) var(--fl-margin) 0; margin-bottom: 0.4em; }
.fl-photo-slot {
  width: 30mm; height: 40mm; margin: 1em auto 0.6em;
  border: 1.5px dashed color-mix(in srgb, var(--fl-accent) 30%, #ccc);
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  color: #8b8983; font-size: 8.5pt;
}
.fl-side .fl-section > h3 { font-size: 11.5pt; }
`;

/** 强调色侧边：左窄色条贯穿 */
export const sidebarCss = printCssBase + `
.fl-paper { position: relative; padding-left: calc(var(--fl-margin) + 7mm); }
.fl-paper::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5mm;
  background: var(--fl-accent);
}
.fl-head .name { color: var(--fl-accent); }
.fl-section > h3 { border-bottom-color: var(--fl-accent); }
`;
