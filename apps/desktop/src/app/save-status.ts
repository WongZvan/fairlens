import type { SaveStatus } from '@fairlens/core';

/**
 * 标题栏保存状态 chip 的展示态（#110）：纯函数，便于单测。
 * 自动模式：error / saving（pending|saving）/ saved
 * 手动模式：dirty→unsaved（警示）；干净→savedManual（明确标注模式，切换开关立即可见）
 */
export type SaveChipKey = 'saved' | 'saving' | 'error' | 'unsaved' | 'savedManual';

export interface SaveChipState {
  key: SaveChipKey;
  warn: boolean;
}

export function saveChipState(input: { autosave: boolean; status: SaveStatus; dirty: boolean }): SaveChipState {
  const { autosave, status, dirty } = input;
  if (autosave) {
    if (status === 'error') return { key: 'error', warn: true };
    if (status === 'pending' || status === 'saving') return { key: 'saving', warn: false };
    return { key: 'saved', warn: false };
  }
  return dirty ? { key: 'unsaved', warn: true } : { key: 'savedManual', warn: false };
}
