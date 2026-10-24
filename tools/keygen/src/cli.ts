import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateKeyPair } from './keys.js';

/**
 * keygen init（m0.4 仅 init；issue/pack/revoke/unbind 在 M2/M5 落地）
 * 用法：pnpm --filter @fairlens/keygen keygen -- init --env dev|prod
 * --env 必填（§3.3：缺省拒绝执行）
 */
const args = process.argv.slice(2);
if (args[0] !== 'init') {
  console.error('M0 阶段仅支持 init 子命令；issue/pack/revoke/unbind 于 M2/M5 交付');
  process.exit(1);
}
const envIdx = args.indexOf('--env');
const env = envIdx !== -1 ? args[envIdx + 1] : undefined;
if (env !== 'dev' && env !== 'prod') {
  console.error('必须显式指定 --env dev|prod（环境分离纪律：缺省拒绝执行）');
  process.exit(1);
}

const keysDir = resolve(import.meta.dirname, '../../../keys');
const pair = generateKeyPair(env);
const pubPath = resolve(keysDir, `${env}.public.json`);
const privPath = resolve(keysDir, `${env}.private.json.enc`);

if (existsSync(privPath)) {
  console.error(`[keygen] ${privPath} 已存在——为防误覆盖拒绝执行；确需重置请手动移除后重跑（旧激活码将全部失效）`);
  process.exit(1);
}
mkdirSync(keysDir, { recursive: true });
writeFileSync(pubPath, pair.publicKeyJson, 'utf8'); // 公钥可入仓（编译进对应构建）
writeFileSync(privPath, pair.privateKeyJson, 'utf8'); // TODO(M2)：AES-GCM 口令加密；keys/ 已 gitignore

console.log(`[keygen] ${env} 密钥对已生成`);
console.log(`  公钥（可入仓）：${pubPath}`);
console.log(`  私钥（绝不入仓，请立即离线双备份）：${privPath}`);
