import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';

/**
 * 密钥对核心（m0.4）：dev/prod 双环境 Ed25519——跨环境激活码密码学互斥（§3.3）。
 * 私钥 JSON 仅写入本地 keys/（.gitignore 已排除，绝不入仓）；离线双备份是运维红线。
 */
export interface KeyPairFiles {
  publicKeyJson: string; // { env, publicKey }——公钥编译进对应环境构建
  privateKeyJson: string; // { env, publicKey, privateKey }——离线保存
}

export function generateKeyPair(env: 'dev' | 'prod'): { publicKey: string; privateKey: string } & KeyPairFiles {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64');
  const publicKey = b64(publicKeyBytes);
  const privateKey = b64(privateKeyBytes);
  return {
    publicKey,
    privateKey,
    publicKeyJson: JSON.stringify({ env, algorithm: 'ed25519', publicKey }, null, 2) + '\n',
    privateKeyJson: JSON.stringify({ env, algorithm: 'ed25519', publicKey, privateKey, note: '离线双备份，绝不入仓/不分发' }, null, 2) + '\n',
  };
}

/** 激活密钥签发/验签核心（issue 完整命令在 M2 随 provision 落地） */
export function signClaims(claimsJson: string, privateKeyB64: string): string {
  const sig = ed25519.sign(Buffer.from(claimsJson, 'utf8'), Buffer.from(privateKeyB64, 'base64'));
  return Buffer.from(sig).toString('base64');
}

export function verifyClaims(claimsJson: string, signatureB64: string, publicKeyB64: string): boolean {
  return ed25519.verify(
    Buffer.from(signatureB64, 'base64'),
    Buffer.from(claimsJson, 'utf8'),
    Buffer.from(publicKeyB64, 'base64'),
  );
}
