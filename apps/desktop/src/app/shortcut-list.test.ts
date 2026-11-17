import { describe, expect, it } from 'vitest';
import { allShortcutKeys } from './shortcut-list.js';

describe('快捷键速查表（#127）', () => {
  const keys = allShortcutKeys();

  it('覆盖代码里实际路由的全局键（查不到=用户永远学不会）', () => {
    for (const combo of ['Ctrl+K', 'Ctrl+Shift+K', 'Ctrl+S', 'Ctrl+F', 'Ctrl+D', 'Ctrl+Shift+V', '?']) {
      expect(keys, combo).toContain(combo);
    }
  });

  it('覆盖编辑器内埋没能力（Tab/Shift+Enter/Ctrl+点击/Ctrl+滚轮）', () => {
    for (const combo of ['Enter', 'Shift+Enter', 'Tab', 'Shift+Tab', 'Ctrl+点击', 'Ctrl+滚轮']) {
      expect(keys, combo).toContain(combo);
    }
  });

  it('键位不重复', () => {
    expect(new Set(keys).size).toBe(keys.length);
  });
});
