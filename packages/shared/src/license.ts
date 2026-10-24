import { z } from 'zod';
import { Iso8601 } from './common.js';

/** 双证授权（§4.5）：
 *  License = 离线 Ed25519 验签（exp 密码学强制；dev=null 无限期）
 *  Lease   = 在线租约（TTL 7 天，KV 唯一执行源；maxDevices 在 License 中仅为展示性字段） */
export const LicenseRole = z.enum(['user', 'dev', 'expert']); // expert=1.0 启用（v1.8 预留）
export const LicenseClaims = z.object({
  v: z.literal(1),
  code: z.string().min(1),
  role: LicenseRole,
  batchId: z.string().min(1),
  exp: Iso8601.nullable(),
  maxDevices: z.number().int().positive().optional(),
  iat: Iso8601,
});
export type LicenseClaims = z.infer<typeof LicenseClaims>;

export const LeaseClaims = z.object({
  code: z.string().min(1),
  deviceIdHash: z.string().regex(/^[0-9a-f]{64}$/), // SHA-256
  exp: Iso8601,
});
export type LeaseClaims = z.infer<typeof LeaseClaims>;

/** KV plan 套餐类型位（v1.10，v0.1 不写入）——机构网关（0.x）限额用 */
export const PlanQuota = z.object({
  name: z.string().min(1),
  monthlyTokenCap: z.number().int().positive().optional(),
  rpm: z.number().int().positive().optional(),
  priority: z.number().int().min(0).max(9).optional(),
});
export type PlanQuota = z.infer<typeof PlanQuota>;

/** KV 记录（§10.2，设备数唯一执行源） */
export const LeaseKvRecord = z.object({
  devices: z.array(z.object({ id: z.string().regex(/^[0-9a-f]{64}$/), exp: Iso8601 })),
  revoked: z.boolean(),
  maxN: z.number().int().positive(),
  batchId: z.string().min(1),
  aiOn: z.number().int().nonnegative(),
  aiOff: z.number().int().nonnegative(),
  plan: PlanQuota.optional(),
});
export type LeaseKvRecord = z.infer<typeof LeaseKvRecord>;
