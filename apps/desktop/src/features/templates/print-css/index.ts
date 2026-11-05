/** 三套模板的 printCSS 变体（m1.2；2026-11-05 预览纸面对齐 #117）：base + 布局差异层 */
import { printCssBase } from './base.js';

/** 经典单栏：页头墨线 + 单栏顺序流（页头样式在 base） */
export const classicCss = printCssBase + `
.fl-head { padding: 0; }
`;

/** 侧栏双栏：grid 左栏（basic/skill + 照片槽）+ 右主栏 */
export const duoCss = printCssBase + `
.fl-paper {
  display: grid;
  grid-template-columns: 73.5mm 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "head head" "side main";
  padding: 0;
  column-gap: 0;
}
.fl-head { grid-area: head; padding: 12mm 15mm 3mm; margin: 0; }
.fl-head .rule { display: none; }
.fl-side {
  grid-area: side;
  background: #f4f3ed;
  border-right: 1px solid #eceae2;
  padding: 3mm 7mm 9mm;
}
.fl-main { grid-area: main; padding: 2mm 15mm 11mm; }
.fl-photo-slot { display: flex; }
.fl-side .fl-section > h3 { margin-top: 4mm; }
`;

/** 强调色侧边：左窄色条贯穿（无预览对照，沿用品牌版式） */
export const sidebarCss = printCssBase + `
.fl-paper { position: relative; padding-left: calc(var(--fl-margin-x) + 7mm); }
.fl-paper::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5mm;
  background: var(--fl-accent);
}
.fl-head .name b { color: var(--fl-accent); }
.fl-section > h3::after { border-top-color: var(--fl-accent); }
`;
