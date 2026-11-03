import { describe, expect, it } from 'vitest';
import { saveStatusView } from './save-status.js';
import { resolveGuardMode } from './CloseGuard.js';

describe('saveStatusView（#112 状态栏保存指示）', () => {
  it('自动模式：绿点 + 自动保存，状态跟随保存机', () => {
    expect(saveStatusView({ autosave: true, status: 'saved', dirty: false })).toEqual({ dot: 'ok', modeKey: 'auto', stateKey: 'saved', warn: false });
    expect(saveStatusView({ autosave: true, status: 'pending', dirty: true })).toEqual({ dot: 'ok', modeKey: 'auto', stateKey: 'saving', warn: false });
    expect(saveStatusView({ autosave: true, status: 'saving', dirty: true })).toEqual({ dot: 'ok', modeKey: 'auto', stateKey: 'saving', warn: false });
    expect(saveStatusView({ autosave: true, status: 'error', dirty: true })).toEqual({ dot: 'ok', modeKey: 'auto', stateKey: 'error', warn: true });
  });

  it('手动模式：红点 + 手动保存，状态由 dirty 决定', () => {
    expect(saveStatusView({ autosave: false, status: 'saved', dirty: false })).toEqual({ dot: 'warn', modeKey: 'manual', stateKey: 'saved', warn: false });
    expect(saveStatusView({ autosave: false, status: 'saved', dirty: true })).toEqual({ dot: 'warn', modeKey: 'manual', stateKey: 'unsaved', warn: true });
    // 手动模式不读 controller 瞬时状态
    expect(saveStatusView({ autosave: false, status: 'error', dirty: false })).toEqual({ dot: 'warn', modeKey: 'manual', stateKey: 'saved', warn: false });
  });
});

describe('resolveGuardMode（关窗保护判定，回归）', () => {
  it('手动模式有脏 → manual-dirty（三键框）', () => {
    expect(resolveGuardMode(false, true, [])).toBe('manual-dirty');
  });
  it('手动模式干净 → null（直接关）', () => {
    expect(resolveGuardMode(false, false, [])).toBeNull();
  });
  it('手动脏 + 未完成 → merged', () => {
    expect(resolveGuardMode(false, true, ['导入向导未完成'])).toBe('merged');
  });
});
