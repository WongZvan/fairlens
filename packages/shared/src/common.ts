import { z } from 'zod';

/** nanoid(12)：URL 友全字母数字字符集，生成后永不变（块锚点） */
export const NANOID12_RE = /^[A-Za-z0-9_-]{12}$/;
export const Nanoid12 = z.string().regex(NANOID12_RE);

/** ISO8601 字符串（评估时间戳/归档时间等） */
export const Iso8601 = z.string().datetime({ offset: true });

/**
 * 'YYYY.MM' 月份（2026-11-13 起**仅作旧值合法性校验**，不再约束 Entry.start/end）。
 * Entry 日期已放开为自由文本（#122）：'2022'、'2022年9月'、'大三' 均合法。
 * 保留此 schema 供 repair-doc 与排序类工具识别「结构化可比较」的日期。
 */
export const YearMonth = z.string().regex(/^\d{4}\.(0[1-9]|1[0-2])$/);

/** 判断自由文本日期是否为可比较的 'YYYY.MM'（用于 end ≥ start 校验与排序） */
export function isYearMonth(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}\.(0[1-9]|1[0-2])$/.test(value);
}

/** 链接 scheme 白名单：http/https/mailto（拦 javascript: 等注入，§5.2） */
const SAFE_HREF = z.string().url().refine(
  (v) => /^https?:/i.test(v) || /^mailto:/i.test(v),
  { message: '链接 scheme 仅允许 http/https/mailto' },
);
export { SAFE_HREF as SafeHref };

/** 单一事实源：非空带尾导出错误码（§4.5 / 附录 C） */
export const ErrorCode = z.enum([
  'bad-signature',
  'expired',
  'revoked',
  'unknown-code',
  'slots-full',
  'lease-expired',
  'invalid-request',
  'unauthorized',
] as const);
export type ErrorCode = z.infer<typeof ErrorCode>;
