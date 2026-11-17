import { describe, expect, it } from 'vitest';
import { resolveShortcut, shouldIgnoreShortcut } from './shortcuts.js';
import { commandRegistry } from './command-registry.js';

const ev = (over: Partial<Parameters<typeof resolveShortcut>[0]> = {}) => ({
  ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: '',
  ...over,
});

describe('m1.5 快捷键路由（§5.6 全表）', () => {
  it('Ctrl+K 恒为命令面板（#127：同一键不再二义）', () => {
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'k' }), { hasSelection: true, inEditor: true })).toBe('command-palette');
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'k' }), { hasSelection: false, inEditor: true })).toBe('command-palette');
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'k' }), { hasSelection: false, inEditor: false })).toBe('command-palette');
  });

  it('Ctrl+Shift+K 插链接（仅编辑器内）', () => {
    expect(resolveShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'k' }), { hasSelection: true, inEditor: true })).toBe('insert-link');
    expect(resolveShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'k' }), { hasSelection: false, inEditor: false })).toBeNull();
  });

  it('场景键：Ctrl+Enter 修订 / Ctrl+Shift+E 评估 / Ctrl+S 保存 / Ctrl+D 复制块', () => {
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'enter' }), { hasSelection: false, inEditor: true })).toBe('revise-block');
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'enter' }), { hasSelection: false, inEditor: false })).toBeNull();
    expect(resolveShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'e' }), { hasSelection: false, inEditor: false })).toBe('evaluate');
    expect(resolveShortcut(ev({ ctrlKey: true, key: 's' }), { hasSelection: false, inEditor: true })).toBe('save');
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'd' }), { hasSelection: false, inEditor: true })).toBe('duplicate-block');
  });

  it('粘贴/查找/批注导航', () => {
    expect(resolveShortcut(ev({ ctrlKey: true, shiftKey: true, key: 'v' }), { hasSelection: false, inEditor: true })).toBe('paste-plain');
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'f' }), { hasSelection: false, inEditor: true })).toBe('find');
    expect(resolveShortcut(ev({ altKey: true, key: 'arrowdown' }), { hasSelection: false, inEditor: true })).toBe('annotation-next');
    expect(resolveShortcut(ev({ altKey: true, key: 'arrowup' }), { hasSelection: false, inEditor: true })).toBe('annotation-prev');
  });

  it('普通键不误触发（无组合键/未知组合）', () => {
    expect(resolveShortcut(ev({ key: 'k' }), { hasSelection: false, inEditor: true })).toBeNull();
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'x' }), { hasSelection: false, inEditor: true })).toBeNull();
  });

  it('输入框/浮层内不触发全局快捷键（#127 守卫）', () => {
    const input = { tagName: 'INPUT' } as unknown as Element;
    const textarea = { tagName: 'TEXTAREA' } as unknown as Element;
    const div = { tagName: 'DIV' } as unknown as Element;
    expect(shouldIgnoreShortcut(input, false)).toBe(true);
    expect(shouldIgnoreShortcut(textarea, false)).toBe(true);
    expect(shouldIgnoreShortcut(div, true)).toBe(true);
    expect(shouldIgnoreShortcut(div, false)).toBe(false);
    expect(shouldIgnoreShortcut(null, false)).toBe(false);
  });

  it('IME 合成态：组合键一律不触发（中文输入不误触保存/复制/修订）', () => {
    expect(resolveShortcut(ev({ ctrlKey: true, key: 's', isComposing: true }), { hasSelection: false, inEditor: true })).toBeNull();
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'd', isComposing: true }), { hasSelection: false, inEditor: true })).toBeNull();
    expect(resolveShortcut(ev({ ctrlKey: true, key: 'enter', isComposing: true }), { hasSelection: false, inEditor: true })).toBeNull();
    expect(resolveShortcut(ev({ keyCode: 229, key: 'Enter' }), { hasSelection: false, inEditor: true })).toBeNull();
  });
});

describe('m1.5 CommandRegistry', () => {
  it('注册/注销/搜索/devOnly 门控', () => {
    const off1 = commandRegistry.register({ id: 'test.save', title: '保存', keywords: ['save'], run: () => {} });
    const off2 = commandRegistry.register({ id: 'test.dev', title: '重载包', devOnly: true, run: () => {} });
    expect(commandRegistry.list(false).some((c) => c.id === 'test.dev')).toBe(false);
    expect(commandRegistry.list(true).some((c) => c.id === 'test.dev')).toBe(true);
    expect(commandRegistry.search('save', false)).toHaveLength(1);
    expect(commandRegistry.search('保存', false)).toHaveLength(1);
    off1();
    off2();
    expect(commandRegistry.list(true)).toHaveLength(0);
  });
});
