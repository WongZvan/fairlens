/**
 * printCSS 公共骨架（m1.2）：A4 尺寸/分页规则/--fl-* 变量组（docs/01 §8）。
 * 三投影原则：画布编辑与 PDF 导出共用同一 CSS（编辑样式=导出样式）。
 */
export const printCssBase = `
:root {
  --fl-heading: 'Noto Serif SC', serif;
  --fl-body: 'Noto Serif SC', serif;
  --fl-accent: #33518e;
  /* 密度令牌（auto 解析为模板默认档 normal） */
  --fl-line-height: 1.55;      /* compact 1.40 / normal 1.55 / loose 1.75 */
  --fl-entry-gap: 0.6em;       /* compact 0.35em / normal 0.6em / loose 1em */
  --fl-section-gap: 1.1em;     /* compact 0.7em / normal 1.1em / loose 1.6em */
  --fl-margin: 1.6cm;
}

@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
}

/* 纸面骨架：A4 比例（566px ≈ 210mm @96dpi 的 3/4 缩放基准） */
.fl-paper {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  color: #1c1d1b;
  font-family: var(--fl-body);
  font-size: 10.5pt;
  line-height: var(--fl-line-height);
  padding: var(--fl-margin);
  box-sizing: border-box;
}

/* 分页纪律：条目不跨页、防孤行（docs/01 §8 printCSS 约定） */
.fl-entry { break-inside: avoid; page-break-inside: avoid; }
.fl-section > h3 { break-after: avoid; page-break-after: avoid; }

.fl-section { margin-bottom: var(--fl-section-gap); }
.fl-section > h3 {
  font-family: var(--fl-heading);
  font-size: 13pt;
  letter-spacing: 0.14em;
  margin: 0 0 var(--fl-entry-gap) 0;
  padding-bottom: 0.25em;
  border-bottom: 1px solid color-mix(in srgb, var(--fl-accent) 35%, #999);
  color: inherit;
}
.fl-entry + .fl-entry { margin-top: var(--fl-entry-gap); }
.fl-entry .row {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
}
.fl-entry .row b { font-size: 11pt; }
.fl-entry .role { color: #5a5955; }
.fl-entry .date { margin-left: auto; color: #8b8983; font-size: 9pt; }
.fl-bullets { margin: 0.3em 0 0; padding: 0; list-style: none; }
.fl-bullets li { position: relative; padding-left: 1em; margin: 0.18em 0; }
.fl-bullets li::before {
  content: '';
  position: absolute;
  left: 0.15em;
  top: 0.55em;
  width: 4px;
  height: 4px;
  background: var(--fl-accent);
}
.fl-head { display: flex; flex-direction: column; gap: 0.2em; margin-bottom: 1.2em; }
.fl-head .name { font-family: var(--fl-heading); font-size: 22pt; font-weight: 700; letter-spacing: 0.06em; }
.fl-head .contact { color: #5a5955; font-size: 9.5pt; }
.fl-head .contact a { color: var(--fl-accent); text-decoration: underline; text-underline-offset: 2px; }
`;
