import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from './run.js';

function capture() {
  const lines: string[] = [];
  return { lines, fn: (s: string) => lines.push(s) };
}

function fakePair(env: 'dev' | 'prod') {
  return {
    publicKey: `pub-${env}`,
    privateKey: `priv-${env}`,
    publicKeyJson: `{"env":"${env}","publicKey":"pub-${env}"}\n`,
    privateKeyJson: `{"env":"${env}","privateKey":"priv-${env}"}\n`,
  };
}

describe('runCli', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('拒绝非 init 子命令', () => {
    const err = capture();
    const code = runCli(['issue', '--env', 'dev'], { keysDir: '/tmp/keys', error: err.fn });
    expect(code).toBe(1);
    expect(err.lines.join('\n')).toContain('仅支持 init');
  });

  it('缺 --env 时拒绝执行（环境分离纪律）', () => {
    const err = capture();
    const code = runCli(['init'], { keysDir: '/tmp/keys', error: err.fn });
    expect(code).toBe(1);
    expect(err.lines.join('\n')).toContain('必须显式指定 --env');
  });

  it('--env 取值非法时拒绝执行', () => {
    const err = capture();
    const code = runCli(['init', '--env', 'staging'], { keysDir: '/tmp/keys', error: err.fn });
    expect(code).toBe(1);
    expect(err.lines.join('\n')).toContain('必须显式指定 --env');
  });

  it('私钥已存在时拒绝覆盖，且不写任何文件', () => {
    const err = capture();
    const writes: string[] = [];
    const code = runCli(['init', '--env', 'dev'], {
      keysDir: '/tmp/keys',
      exists: () => true,
      writeFile: (p) => writes.push(p),
      error: err.fn,
    });
    expect(code).toBe(1);
    expect(err.lines.join('\n')).toContain('已存在');
    expect(writes).toEqual([]);
  });

  it('dev 成功生成：公钥/私钥落到注入目录', () => {
    const log = capture();
    const writes = new Map<string, string>();
    const code = runCli(['init', '--env', 'dev'], {
      keysDir: '/tmp/keys',
      exists: () => false,
      mkdir: () => {},
      writeFile: (p, data) => void writes.set(p, data),
      generate: fakePair,
      log: log.fn,
    });
    expect(code).toBe(0);
    expect([...writes.keys()].sort()).toEqual(
      [resolve('/tmp/keys', 'dev.private.json.enc'), resolve('/tmp/keys', 'dev.public.json')].sort(),
    );
    expect(writes.get(resolve('/tmp/keys', 'dev.public.json'))).toContain('pub-dev');
    expect(writes.get(resolve('/tmp/keys', 'dev.private.json.enc'))).toContain('priv-dev');
    expect(log.lines.join('\n')).toContain('dev 密钥对已生成');
  });

  it('prod 走同一路径（双环境互斥）', () => {
    const writes = new Map<string, string>();
    const code = runCli(['init', '--env', 'prod'], {
      keysDir: '/tmp/keys',
      exists: () => false,
      mkdir: () => {},
      writeFile: (p, data) => void writes.set(p, data),
      generate: fakePair,
      log: () => {},
    });
    expect(code).toBe(0);
    expect([...writes.keys()].some((p) => p.includes('prod.private.json.enc'))).toBe(true);
  });

  it('默认依赖可用：真实临时目录端到端写盘', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fairlens-keygen-'));
    tmpDirs.push(dir);
    const code = runCli(['init', '--env', 'dev'], { keysDir: dir, log: () => {} });
    expect(code).toBe(0);
    expect(JSON.parse(readFileSync(resolve(dir, 'dev.public.json'), 'utf8')).env).toBe('dev');
    expect(JSON.parse(readFileSync(resolve(dir, 'dev.private.json.enc'), 'utf8')).env).toBe('dev');
    // 第二次运行必须拒绝覆盖
    const err = capture();
    expect(runCli(['init', '--env', 'dev'], { keysDir: dir, error: err.fn, log: () => {} })).toBe(1);
    expect(err.lines.join('\n')).toContain('已存在');
  });
});
