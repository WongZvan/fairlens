import { describe, expect, it } from 'vitest';
import { generateKeyPair, signClaims, verifyClaims } from './keys.js';

describe('keygen 密钥核心（m0.4）', () => {
  it('dev/prod 双密钥对互验互斥（跨环境验签必然失败，§3.3）', () => {
    const dev = generateKeyPair('dev');
    const prod = generateKeyPair('prod');
    const claims = JSON.stringify({ v: 1, code: 'FL-X', role: 'user', iat: '2026-10-24T00:00:00+08:00' });
    const devSig = signClaims(claims, dev.privateKey);
    expect(verifyClaims(claims, devSig, dev.publicKey)).toBe(true);
    expect(verifyClaims(claims, devSig, prod.publicKey)).toBe(false); // 密码学互斥
  });

  it('篡改载荷验签失败', () => {
    const pair = generateKeyPair('dev');
    const sig = signClaims('{"a":1}', pair.privateKey);
    expect(verifyClaims('{"a":2}', sig, pair.publicKey)).toBe(false);
  });

  it('产出的 JSON 文件含环境标签与算法', () => {
    const pair = generateKeyPair('prod');
    expect(JSON.parse(pair.publicKeyJson)).toMatchObject({ env: 'prod', algorithm: 'ed25519' });
    expect(JSON.parse(pair.privateKeyJson).publicKey).toBe(pair.publicKey);
  });
});
