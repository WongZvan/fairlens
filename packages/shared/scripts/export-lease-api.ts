/** 契约冻结导出：写入 functions/lease/contract/lease-api.v1.json（修改契约后运行并提交） */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildContractJson } from './build-contract.js';

const outPath = resolve(import.meta.dirname, '../../../functions/lease/contract/lease-api.v1.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buildContractJson(), 'utf8');
console.log(`[contract] 已导出 ${outPath}`);
