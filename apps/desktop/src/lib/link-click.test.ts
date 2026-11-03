import { describe, expect, it } from 'vitest';
import { hrefFromLinkMouseDown } from './link-click.js';

const anchor = (href: string) => ({
  closest: (sel: string) => (sel === 'a[href]' ? { getAttribute: (n: string) => (n === 'href' ? href : null) } : null),
});

describe('hrefFromLinkMouseDown（#111 Ctrl+点击链接）', () => {
  it('Ctrl/Meta + 左键 + 链接 → 返回 href', () => {
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: true, metaKey: false, target: anchor('https://example.com') })).toBe('https://example.com');
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: false, metaKey: true, target: anchor('mailto:a@b.c') })).toBe('mailto:a@b.c');
  });

  it('无修饰键 / 非左键 → null（普通点击仍是编辑光标）', () => {
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: false, metaKey: false, target: anchor('https://example.com') })).toBeNull();
    expect(hrefFromLinkMouseDown({ button: 2, ctrlKey: true, metaKey: false, target: anchor('https://example.com') })).toBeNull();
  });

  it('非链接目标 / 无 href → null', () => {
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: true, metaKey: false, target: {} })).toBeNull();
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: true, metaKey: false, target: anchor('') })).toBeNull();
  });

  it('scheme 白名单：javascript:/file: 一律拒绝', () => {
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: true, metaKey: false, target: anchor('javascript:alert(1)') })).toBeNull();
    expect(hrefFromLinkMouseDown({ button: 0, ctrlKey: true, metaKey: false, target: anchor('file:///C:/x') })).toBeNull();
  });
});
