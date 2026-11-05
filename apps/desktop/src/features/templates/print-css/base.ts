/**
 * printCSS 公共骨架（m1.2；2026-11-05 预览纸面对齐 #117）：
 * A4 尺寸/分页规则/--fl-* 变量组（docs/01 §8）；画布编辑与 PDF 导出共用同一 CSS。
 * 字号按预览画板（566×800 ≈ A4 的 0.713 倍）等比 ×1.4023 换算为 pt/mm。
 */
export const printCssBase = `
:root {
  --fl-heading: 'Noto Serif SC', serif;
  --fl-body: 'IBM Plex Sans', 'IBM Plex Sans SC', 'Microsoft YaHei', sans-serif;
  --fl-accent: #33518e;
  /* 密度令牌（auto 解析为模板默认档 normal；预览基线 1.5） */
  --fl-line-height: 1.50;
  --fl-entry-gap: 0.55em;
  --fl-section-gap: 0.9em;
  --fl-margin-y: 17mm;
  --fl-margin-x: 20mm;
}

@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
}

.fl-paper {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  color: #1c1d1b;
  font-family: var(--fl-body);
  font-size: 13pt;
  line-height: var(--fl-line-height);
  padding: var(--fl-margin-y) var(--fl-margin-x);
  box-sizing: border-box;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(28, 29, 27, 0.08), 0 10px 28px rgba(28, 29, 27, 0.10);
}
@media print {
  .fl-paper { box-shadow: none; border-radius: 0; }
}

/* 分页纪律：条目不跨页、防孤行（docs/01 §8 printCSS 约定） */
.fl-entry { break-inside: avoid; page-break-inside: avoid; }
.fl-section > h3 { break-after: avoid; page-break-after: avoid; }

/* 页头（#117）：姓名+意向同一 baseline；联系方式；墨色横线 */
/* React NodeView 会多包一层 .react-renderer；用 display:contents 让 .fl-head 直接参与纸面 grid */
.fl-paper > .react-renderer.node-flPageHeader { display: contents; }
.fl-head { margin: 0 0 4mm; }
.fl-head .name { display: flex; align-items: baseline; gap: 3mm; }
.fl-head .name b {
  font-family: var(--fl-heading);
  font-weight: 700;
  font-size: 28pt;
  letter-spacing: 0.06em;
}
.fl-head .intent { color: #5a5955; font-size: 12pt; }
.fl-head .contact { margin: 1.5mm 0 0; color: #5a5955; font-size: 11.5pt; }
.fl-head .contact a { color: #33518e; text-decoration: underline; text-underline-offset: 2px; }
.fl-head .rule { border-top: 2px solid #1c1d1b; margin-top: 3.5mm; }

/* 分区标题：文字 + 尾部细线（预览 14.5px → 15pt） */
.fl-section { margin-bottom: var(--fl-section-gap); }
.fl-section > h3 {
  font-family: var(--fl-heading);
  font-size: 15pt;
  font-weight: 600;
  letter-spacing: 0.14em;
  margin: 6mm 0 2mm;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 2.5mm;
  border: 0;
  color: inherit;
}
.fl-section > h3::after { content: ''; flex: 1; border-top: 1px solid #d9d6cf; }

/* 条目：org/role/date 三段行（date mono 靠右） */
.fl-entry + .fl-entry { margin-top: var(--fl-entry-gap); }
.fl-entry-head .row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2mm; row-gap: 0.4mm; }
.fl-entry-head .row b { font-weight: 600; font-size: 13.5pt; white-space: nowrap; }
.fl-entry-head .role { color: #5a5955; white-space: nowrap; }
.fl-entry-head .date {
  margin-left: auto;
  color: #8b8983;
  font-size: 11.5pt;
  font-family: 'IBM Plex Mono', monospace;
  white-space: nowrap;
}

/* 要点：方块 marker 用墨色（预览），不依赖 ul 容器 */
article[data-type="fl-entry"] > li[data-type="fl-bullet"] {
  position: relative;
  list-style: none;
  padding-left: 4mm;
  margin: 1mm 0;
  color: #33322f;
}
article[data-type="fl-entry"] > li[data-type="fl-bullet"]::before {
  content: '';
  position: absolute;
  left: 0.6mm;
  top: 0.62em;
  width: 1.5mm;
  height: 1.5mm;
  background: #1c1d1b;
}

/* 基本信息字段 / 技能组（#117）：值原生编辑；label/组名保留数据但预览不显示 */
.fl-basic-field { margin: 1mm 0; color: #33322f; font-size: 12pt; }
.fl-field-label { display: none; }
.fl-field-value { display: inline; }
.fl-basic-field a { color: #33518e; text-decoration: underline; text-underline-offset: 2px; }
.fl-skill-group { margin: 1mm 0; color: #33322f; font-size: 12pt; }
.fl-skill-name { display: none; }
.fl-skill-items { display: inline; }

/* 照片槽：默认隐藏；duo 显示虚线占位（真实上传随 m5.1） */
.fl-photo-slot {
  display: none;
  width: 28mm;
  height: 36mm;
  margin: 3mm auto 1mm;
  border: 1.5px dashed #d9d6cf;
  border-radius: 3px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1mm;
  color: #8b8983;
  font-size: 10.5pt;
}
.fl-photo-slot img { width: 100%; height: 100%; object-fit: cover; border-radius: 2px; }

/* 编辑按钮只属于屏幕交互；打印/导出隐藏 */
.fl-edit-btn {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d6cf;
  border-radius: 4px;
  background: #fff;
  color: #8b8983;
  cursor: pointer;
  opacity: 0;
  margin-left: 2mm;
  vertical-align: middle;
  padding: 0;
}
.fl-head:hover .fl-edit-btn,
.fl-entry-head:hover .fl-edit-btn,
.fl-edit-btn:focus-visible { opacity: 1; }
.fl-edit-btn:hover { color: #33518e; border-color: #33518e; }
@media print {
  .fl-edit-btn { display: none !important; }
}
`;
