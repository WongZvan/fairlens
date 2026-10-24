import { z } from 'zod';

/** nanoid(12)：URL 友全字母数字字符集，生成后永不变（块锚点） */
export const NANOID12_RE = /^[A-Za-z0-9_-]{12}$/;
export const Nanoid12 = z.string().regex(NANOID12_RE);

/** ISO8601 字符串（评估时间戳/归档时间等） */
export const Iso8601 = z.string().datetime({ offset: true });

/** 'YYYY.MM' 月份（教育与经历起止） */
export const YearMonth = z.string().regex(/^\d{4}\.(0[1-9]|1[0-2])$/);

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
