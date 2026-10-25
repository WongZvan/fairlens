import type { z } from 'zod';
import { SettingKey, SettingValueSchemas, type SettingKey as Key } from '@fairlens/shared';

/** settings 默认值（§5.7 自动保存默认开；#86 画布背景默认跟随主题；透明度默认不透明——规格未定，m1.6 注记） */
export const SETTING_DEFAULTS: Record<Key, unknown> = {
  autosave: true,
  bgMode: 'theme',
  bgImage: null,
  bgOpacity: 100,
  bgFit: 'contain',
};

export type SettingValueOf<K extends Key> = z.infer<(typeof SettingValueSchemas)[K]>;

/** 读库值校验：非法/缺失回落默认（settings 表 value_json 反序列化后必经此函数） */
export function parseSettingValue<K extends Key>(key: K, raw: unknown): SettingValueOf<K> {
  const result = SettingValueSchemas[key].safeParse(raw);
  return (result.success ? result.data : SETTING_DEFAULTS[key]) as SettingValueOf<K>;
}

/** 全量读取：库值 + 默认值合并（m1.6 预留键保证总有值可取） */
export function mergeSettingDefaults(raw: Partial<Record<Key, unknown>>): Record<Key, unknown> {
  const out = { ...SETTING_DEFAULTS };
  for (const key of SettingKey.options) {
    if (raw[key] !== undefined) out[key] = parseSettingValue(key, raw[key]);
  }
  return out;
}
