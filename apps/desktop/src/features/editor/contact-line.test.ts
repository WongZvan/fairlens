import { describe, expect, it } from 'vitest';
import { tokenizeContactLine } from './contact-line.js';

describe('页头联系方式链接化（#117）', () => {
  it('电话/邮箱/裸域名混排：只把邮箱与域名变成链接', () => {
    const tokens = tokenizeContactLine('138****2321 · lisiyuan@mail.com · github.com/lisiyuan');
    expect(tokens.filter((t) => t.type === 'link')).toEqual([
      { type: 'link', text: 'lisiyuan@mail.com', href: 'mailto:lisiyuan@mail.com' },
      { type: 'link', text: 'github.com/lisiyuan', href: 'https://github.com/lisiyuan' },
    ]);
  });

  it('http/https/mailto 原样保留', () => {
    const tokens = tokenizeContactLine('https://example.com/a · mailto:a@b.com');
    expect(tokens.filter((t) => t.type === 'link')).toEqual([
      { type: 'link', text: 'https://example.com/a', href: 'https://example.com/a' },
      { type: 'link', text: 'mailto:a@b.com', href: 'mailto:a@b.com' },
    ]);
  });

  it('javascript:/data: 不产生链接', () => {
    const tokens = tokenizeContactLine('javascript:alert(1) · data:text/html,x');
    expect(tokens.every((t) => t.type === 'text')).toBe(true);
  });

  it('纯文本原样返回；空串返回空数组', () => {
    expect(tokenizeContactLine('武汉 · 可即时到岗')).toEqual([{ type: 'text', text: '武汉 · 可即时到岗' }]);
    expect(tokenizeContactLine('')).toEqual([]);
  });
});
