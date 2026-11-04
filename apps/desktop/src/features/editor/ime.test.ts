import { describe, expect, it } from 'vitest';
import { isComposingKey } from './ime.js';

describe('IME 合成态判定', () => {
  it('isComposing=true 视为合成态', () => {
    expect(isComposingKey({ isComposing: true })).toBe(true);
  });

  it('keyCode 229 视为合成态（部分 IME/浏览器只给 keyCode）', () => {
    expect(isComposingKey({ keyCode: 229 })).toBe(true);
  });

  it('普通按键/缺省字段不误判', () => {
    expect(isComposingKey({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(isComposingKey({})).toBe(false);
    expect(isComposingKey({ keyCode: 86 })).toBe(false);
  });
});
