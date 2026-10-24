/** CI 零漂移校验：现场构建与仓内冻结文件比对，漂移即退出非零（红灯）
 *  换行归一：Windows autocrlf 工作区为 CRLF、CI 为 LF，比对前统一归一（内容零漂移才是校验目标） */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildContractJson } from './build-contract.js';

const frozenPath = resolve(import.meta.dirname, '../../../functions/lease/contract/lease-api.v1.json');
const normalize = (s: string) => s.replace(/\r\n/g, '\n');
const frozen = normalize(readFileSync(frozenPath, 'utf8'));
const fresh = normalize(buildContractJson());

if (fresh !== frozen) {
  console.error('[contract] 漂移！lease-api.v1.json 与 shared zod 不一致——请运行 pnpm contract:export 并提交');
  process.exit(1);
}
console.log('[contract] 零漂移 ✔');
