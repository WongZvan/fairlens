import { describe, expect, it } from 'vitest';
import { isSafeHref } from './link-policy.js';

describe('链接 scheme 白名单（§9：schema 层强制）', () => {
  it('放行 http/https/mailto', () => {
    expect(isSafeHref('https://example.com/a?b=1')).toBe(true);
    expect(isSafeHref('http://example.com')).toBe(true);
    expect(isSafeHref('mailto:a@example.com')).toBe(true);
  });

  it('拒绝脚本/数据/本地/文件与其他 scheme', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHref('file:///C:/secret.txt')).toBe(false);
    expect(isSafeHref('ftp://example.com/x')).toBe(false);
    expect(isSafeHref('tel:123456')).toBe(false);
    expect(isSafeHref('sms:123456')).toBe(false);
  });

  it('拒绝相对地址/裸域名/空串', () => {
    expect(isSafeHref('/relative/path')).toBe(false);
    expect(isSafeHref('example.com')).toBe(false);
    expect(isSafeHref('')).toBe(false);
    expect(isSafeHref('   ')).toBe(false);
  });

  it('trim 与大小写归一', () => {
    expect(isSafeHref('  https://example.com  ')).toBe(true);
    expect(isSafeHref('HTTPS://EXAMPLE.COM')).toBe(true);
    expect(isSafeHref('MAILTO:a@example.com')).toBe(true);
  });
});
