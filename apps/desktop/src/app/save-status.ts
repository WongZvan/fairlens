import type { SaveStatus } from '@fairlens/core';

/**
 * 状态栏保存指示（#112）：纯函数，便于单测。
 * 圆点颜色 = 保存模式（绿=自动保存，红=手动保存，跟随设置窗开关）；
 * 文字 = 「自动保存 / 手动保存」+ 即时状态（已保存 / 保存中… / 保存失败 / 未保存）。
 */
export type SaveStateKey = 'saved' | 'saving' | 'error' | 'unsaved';

export interface SaveStatusView {
  /** 模式圆点：ok=绿（自动），warn=红（手动） */
  dot: 'ok' | 'warn';
  modeKey: 'auto' | 'manual';
  stateKey: SaveStateKey;
  /** 状态文字是否告警（保存失败 / 未保存） */
  warn: boolean;
}

export function saveStatusView(input: { autosave: boolean; status: SaveStatus; dirty: boolean }): SaveStatusView {
  const { autosave, status, dirty } = input;
  if (autosave) {
    if (status === 'error') return { dot: 'ok', modeKey: 'auto', stateKey: 'error', warn: true };
    if (status === 'pending' || status === 'saving') return { dot: 'ok', modeKey: 'auto', stateKey: 'saving', warn: false };
    return { dot: 'ok', modeKey: 'auto', stateKey: 'saved', warn: false };
  }
  return { dot: 'warn', modeKey: 'manual', stateKey: dirty ? 'unsaved' : 'saved', warn: dirty };
}
