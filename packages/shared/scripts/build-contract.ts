/** 契约构建（导出与零漂移校验共用）：shared zod → JSON 字符串 */
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LEASE_API } from '../src/index.js';

export function buildContractJson(): string {
  const contract = {
    name: 'fairlens-lease-api',
    version: LEASE_API.version,
    generatedNote: '由 packages/shared/src/lease-api.ts 导出；修改契约后必须重新导出并提交（CI 零漂移校验）',
    paths: {
      lease: LEASE_API.leasePath,
      adminProvision: LEASE_API.adminProvision,
      adminRevoke: LEASE_API.adminRevoke,
      adminUnbind: LEASE_API.adminUnbind,
    },
    schemas: {
      LeaseRequest: zodToJsonSchema(LEASE_API.schemas.LeaseRequest, { target: 'openApi3' }),
      LeaseResponse: zodToJsonSchema(LEASE_API.schemas.LeaseResponse, { target: 'openApi3' }),
      AdminProvisionRequest: zodToJsonSchema(LEASE_API.schemas.AdminProvisionRequest, { target: 'openApi3' }),
      AdminRevokeRequest: zodToJsonSchema(LEASE_API.schemas.AdminRevokeRequest, { target: 'openApi3' }),
      AdminUnbindRequest: zodToJsonSchema(LEASE_API.schemas.AdminUnbindRequest, { target: 'openApi3' }),
    },
  };
  return JSON.stringify(contract, null, 2) + '\n';
}
