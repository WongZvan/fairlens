/**
 * 条目头日期区间（2026-11-05，#117）：`YYYY.MM – YYYY.MM` / `YYYY.MM – 至今` / `YYYY.MM`。
 * 纯函数供 NodeView 与单测共用；非法输入返回 null，由调用方回退原值。
 * 展示串格式化自 2026-11-13 起由 packages/core/entry-date 单一实现（文档投影同源），此处转出。
 */
import { formatDateRange } from '@fairlens/core';

export { formatDateRange };

export interface DateRange {
  start?: string;
  end?: string;
  ongoing?: boolean;
}

const MONTH_RE = /^(\d{4})\.(0[1-9]|1[0-2])$/;

export function parseDateRange(input: string): DateRange | null {
  const text = input.trim().replace(/\s*[-–—~～]\s*/g, ' – ').replace(/\s+/g, ' ');
  if (!text) return { ongoing: false };

  const ongoingMatch = /^(\d{4}\.\d{2}) – (至今|present|now)$/i.exec(text);
  if (ongoingMatch) {
    const start = ongoingMatch[1]!;
    if (!MONTH_RE.test(start)) return null;
    return { start, ongoing: true };
  }

  const range = /^(\d{4}\.\d{2})(?: – (\d{4}\.\d{2}))?$/.exec(text);
  if (!range) return null;
  const start = range[1]!;
  if (!MONTH_RE.test(start)) return null;
  const end = range[2];
  if (end) {
    if (!MONTH_RE.test(end)) return null;
    if (end < start) return null;
    return { start, end, ongoing: false };
  }
  return { start, ongoing: false };
}
