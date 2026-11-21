import { describe, expect, it } from 'vitest';
import lease from './index.js';

/**
 * M0 占位端点（真实实现=m2.1）：被覆盖率门禁管住，防止「占位代码零测试」。
 * 契约见 functions/lease/contract/lease-api.v1.json（CI contract-zero-drift 冻结）。
 */
describe('lease 占位端点', () => {
  it('任何请求返回 501 + invalid-request（M2 前如实表达未实现）', async () => {
    const res = await lease.fetch();
    expect(res.status).toBe(501);
    expect(res.headers.get('content-type')).toBe('application/json');
    await expect(res.json()).resolves.toEqual({ ok: false, code: 'invalid-request' });
  });
});
