import { resolve } from 'node:path';
import { runCli } from './run.js';

/**
 * keygen init（m0.4 仅 init；issue/pack/revoke/unbind 在 M2/M5 落地）
 * 用法：pnpm --filter @fairlens/keygen keygen -- init --env dev|prod
 * --env 必填（§3.3：缺省拒绝执行）
 *
 * 逻辑全在 run.ts（可单测）；本文件只做入口装配。
 */
const keysDir = resolve(import.meta.dirname, '../../../keys');
process.exit(runCli(process.argv.slice(2), { keysDir }));
