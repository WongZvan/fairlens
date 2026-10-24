import { z } from 'zod';
import { ErrorCode } from './common.js';

/**
 * lease API 契约（§10.3）——契约先行的唯一事实源。
 * CI 从本文件导出冻结 lease-api.v1.json，桌面端与 Worker 双侧校验零漂移（漂移即红灯）。
 */
export const LeaseAction = z.enum(['acquire', 'renew', 'release']);

export const LeaseRequest = z
  .object({
    action: LeaseAction,
    code: z.string().min(1),
    deviceIdHash: z.string().regex(/^[0-9a-f]{64}$/),
    aiConfigured: z.boolean().optional(), // renew 顺带的一比特匿名统计
  })
  .strict();

export const LeaseOk = z.object({ ok: z.literal(true), lease: z.unknown() });
export const LeaseErr = z.object({ ok: z.literal(false), code: ErrorCode });

export const LeaseResponse = z.discriminatedUnion('ok', [LeaseOk, LeaseErr]);

export const AdminProvisionRequest = z
  .object({ code: z.string().min(1), maxN: z.number().int().positive(), batchId: z.string().min(1) })
  .strict();
export const AdminRevokeRequest = z.object({ code: z.string().min(1) }).strict();
export const AdminUnbindRequest = z
  .object({ code: z.string().min(1), all: z.boolean().optional() })
  .strict();

/** 端点清单（路径常量与 CI 导出一致） */
export const LEASE_API = {
  version: 'v1' as const,
  leasePath: '/v1/lease',
  adminProvision: '/v1/admin/provision',
  adminRevoke: '/v1/admin/revoke',
  adminUnbind: '/v1/admin/unbind',
  schemas: { LeaseRequest, LeaseResponse, AdminProvisionRequest, AdminRevokeRequest, AdminUnbindRequest },
} as const;
