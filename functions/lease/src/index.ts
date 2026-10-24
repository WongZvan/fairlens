/**
 * 租赁端点占位（M0）：契约已在 contract/lease-api.v1.json 冻结（CI 零漂移校验）。
 * 真实实现（acquire/renew/release + admin，~100 行，miniflare 测试）于 M2 交付（§3.5 m2.1）。
 */
export default {
  async fetch(): Promise<Response> {
    return Response.json(
      { ok: false, code: 'invalid-request' },
      { status: 501, headers: { 'content-type': 'application/json' } },
    );
  },
};
