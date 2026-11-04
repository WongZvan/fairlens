/**
 * 粘贴归一化纯逻辑（m1.4，docs/01 §5.6 四项）：
 * ① 换行归一/空行折叠 ② 大段粘贴判定（>300 字符或多段落）
 * ③ 表格逐单元格平铺（不丢字） ④ 纯文本 → 可插入片段（<br> 连接，适配要点 inline 上下文）
 * DOM 解析留在 use-paste-normalization.ts；本文件保持纯函数可单测。
 */
export const LARGE_PASTE_CHARS = 300;

/** ④ 换行归一 + 连续空行折叠为单空行（§5.6 清理规则） */
export function normalizePlainText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** ② 大段粘贴：>300 字符，或多段落且超过 120 字符 */
export function isLargePaste(normalizedText: string): boolean {
  return (
    normalizedText.length > LARGE_PASTE_CHARS ||
    (normalizedText.split(/\n\n+/).length > 1 && normalizedText.length > 120)
  );
}

/** ③ 表格行 → 文本行（全角空格分隔单元格；空单元格/全空行剔除） */
export function rowsToLines(rows: string[][]): string[] {
  return rows
    .map((cells) => cells.map((cell) => cell.trim()).filter(Boolean).join('　'))
    .filter(Boolean);
}

/** 纯文本 → 插入片段：转义后按行 <br> 连接（要点/标题均为 inline 内容） */
export function plainTextToHtml(text: string): string {
  return normalizePlainText(text).split('\n').map(escapeHtml).join('<br>');
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
