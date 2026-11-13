/**
 * 条目头日期区间（2026-11-05 #117；2026-11-13 #122 放开为自由文本）。
 *
 * 契约：`Entry.start/end` 为自由字符串——`2022`、`2022年9月`、`2022.09.15`、`大三` 都合法。
 * 本解析器只做三件事：①分隔符归一为「 – 」②识别「至今/present/now」→ ongoing
 * ③能确定方向时把左右拆成 start/end。**不再因格式不符而拒绝输入**（旧行为是
 * 只要不是 `YYYY.MM` 就返回 null，用户填「大三」会被打回，实测报障）。
 *
 * `end ≥ start` 的校验在契约层（`packages/shared/src/resume.ts`），且仅当两端都可比较时执行——
 * 解析器不承担这一职责，否则自由文本又会被卡住。
 *
 * 展示串格式化由 packages/core/entry-date 单一实现（文档投影同源），此处转出。
 */
import { formatDateRange } from '@fairlens/core';

export { formatDateRange };

export interface DateRange {
  start?: string;
  end?: string;
  ongoing?: boolean;
}

/** 分隔符归一：两侧空格可有可无，统一成 ' – ' */
const SEP = /\s*[-–—~～]\s*/g;
const ONGOING_TAIL = /^(.*?)\s*(?:–|—|-)?\s*(至今|present|now)$/i;

export function parseDateRange(input: string): DateRange | null {
  let text = input
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(SEP, ' – ')
    .trim();
  if (!text) return { ongoing: false };

  // 「X 至今 / X present / X now」→ ongoing（X 可以是任意自由文本）
  const ongoing = ONGOING_TAIL.exec(text);
  if (ongoing) {
    const start = (ongoing[1] ?? '').trim();
    return start ? { start, ongoing: true } : { ongoing: true };
  }

  // 半截区间：末尾/开头残留分隔符（用户只填了一侧）
  const trailingOpen = text.endsWith(' –');
  const leadingOpen = text.startsWith('– ');
  if (trailingOpen) text = text.slice(0, -2).trim();
  if (leadingOpen) text = text.slice(2).trim();

  const parts = text.split(' – ');
  if (parts.length >= 2) {
    const start = parts[0]!.trim();
    const end = parts.slice(1).join(' – ').trim();
    return {
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
      ongoing: false,
    };
  }
  const only = text.trim();
  if (leadingOpen && !trailingOpen) return only ? { end: only, ongoing: false } : { ongoing: false };
  return only ? { start: only, ongoing: false } : { ongoing: false };
}