import { describe, expect, it } from 'vitest';
import { mergeSettingDefaults, parseSettingValue, SETTING_DEFAULTS } from './settings.js';

describe('settings 默认与校验（§5.7 / #86）', () => {
  it('默认值：autosave 开 / bgMode 跟随主题 / 透明度 100 / fit contain', () => {
    expect(SETTING_DEFAULTS.autosave).toBe(true);
    expect(SETTING_DEFAULTS.bgMode).toBe('theme');
    expect(SETTING_DEFAULTS.bgOpacity).toBe(100);
    expect(SETTING_DEFAULTS.bgFit).toBe('contain');
    expect(SETTING_DEFAULTS.bgImage).toBeNull();
  });

  it('parseSettingValue：合法值直通，非法回落默认', () => {
    expect(parseSettingValue('autosave', false)).toBe(false);
    expect(parseSettingValue('autosave', 'yes')).toBe(true); // 非法回落
    expect(parseSettingValue('bgMode', 'dark')).toBe('dark');
    expect(parseSettingValue('bgMode', 'blue')).toBe('theme');
    expect(parseSettingValue('bgOpacity', 30)).toBe(30);
    expect(parseSettingValue('bgOpacity', 101)).toBe(100);
    expect(parseSettingValue('bgImage', 'bg/x.png')).toBe('bg/x.png');
    expect(parseSettingValue('bgImage', 42)).toBeNull();
  });

  it('mergeSettingDefaults：库值覆盖默认，缺失键补默认', () => {
    const merged = mergeSettingDefaults({ autosave: false, bgMode: 'custom' });
    expect(merged.autosave).toBe(false);
    expect(merged.bgMode).toBe('custom');
    expect(merged.bgFit).toBe('contain');
    expect(merged.bgOpacity).toBe(100);
  });
});
