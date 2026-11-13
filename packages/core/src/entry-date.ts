/**
 * 条目日期区间展示串（#117 起唯一实现）。
 * 原先在 apps/desktop/src/features/editor/entry-meta.ts，因「文档投影」（doc-projection）
 * 也需要同一格式，上移到 core 单一实现；entry-meta.ts 重新导出以保持既有调用方不变。
 * 解析方向（展示串 → 结构化）仍留在 UI 层——它解析的是用户输入，不是文档数据。
 */
export function formatDateRange(start?: string | null, end?: string | null, ongoing?: boolean | null): string {
  if (!start) return '';
  if (ongoing) return `${start} – 至今`;
  if (end) return `${start} – ${end}`;
  return start;
}