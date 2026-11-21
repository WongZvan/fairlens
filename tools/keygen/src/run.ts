import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateKeyPair, type KeyPairFiles } from './keys.js';

/**
 * keygen init 的可测实现（2026-11-21 从 cli.ts 抽出）：
 * cli.ts 只保留 4 行启动壳，本函数依赖全部可注入 —— 覆盖率门禁（§14）要求 keygen ≥80%，
 * 顶层过程式脚本无法在单测中触达。
 *
 * 行为与原 cli.ts 完全一致：--env 必填（§3.3 环境分离纪律）、已存在私钥拒绝覆盖。
 */
export interface CliDeps {
  /** keys/ 目录绝对路径；cli 传仓库根下 keys/，测试传临时目录 */
  keysDir: string;
  exists?: (path: string) => boolean;
  mkdir?: (path: string) => void;
  writeFile?: (path: string, data: string) => void;
  generate?: (env: 'dev' | 'prod') => KeyPairFiles;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

export function runCli(argv: string[], deps: CliDeps): number {
  const exists = deps.exists ?? existsSync;
  const mkdir = deps.mkdir ?? ((p: string) => mkdirSync(p, { recursive: true }));
  const writeFile = deps.writeFile ?? ((p: string, data: string) => writeFileSync(p, data, 'utf8'));
  const generate = deps.generate ?? generateKeyPair;
  const log = deps.log ?? console.log;
  const error = deps.error ?? console.error;

  if (argv[0] !== 'init') {
    error('M0 阶段仅支持 init 子命令；issue/pack/revoke/unbind 于 M2/M5 交付');
    return 1;
  }
  const envIdx = argv.indexOf('--env');
  const env = envIdx !== -1 ? argv[envIdx + 1] : undefined;
  if (env !== 'dev' && env !== 'prod') {
    error('必须显式指定 --env dev|prod（环境分离纪律：缺省拒绝执行）');
    return 1;
  }

  const pair = generate(env);
  const pubPath = resolve(deps.keysDir, `${env}.public.json`);
  const privPath = resolve(deps.keysDir, `${env}.private.json.enc`);

  if (exists(privPath)) {
    error(`[keygen] ${privPath} 已存在——为防误覆盖拒绝执行；确需重置请手动移除后重跑（旧激活码将全部失效）`);
    return 1;
  }
  mkdir(deps.keysDir);
  writeFile(pubPath, pair.publicKeyJson); // 公钥可入仓（编译进对应构建）
  writeFile(privPath, pair.privateKeyJson); // TODO(M2)：AES-GCM 口令加密；keys/ 已 gitignore

  log(`[keygen] ${env} 密钥对已生成`);
  log(`  公钥（可入仓）：${pubPath}`);
  log(`  私钥（绝不入仓，请立即离线双备份）：${privPath}`);
  return 0;
}
