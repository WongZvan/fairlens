import { describe, expect, it } from 'vitest';
import { saveChipState } from './save-status.js';
import { resolveGuardMode } from './CloseGuard.js';

describe('saveChipState（#110 标题栏状态）', () => {
  it('自动模式：error/saving/saved', () => {
    expect(saveChipState({ autosave: true, status: 'error', dirty: true })).toEqual({ key: 'error', warn: true });
    expect(saveChipState({ autosave: true, status: 'pending', dirty: true })).toEqual({ key: 'saving', warn: false });
    expect(saveChipState({ autosave: true, status: 'saving', dirty: true })).toEqual({ key: 'saving', warn: false });
    expect(saveChipState({ autosave: true, status: 'saved', dirty: false })).toEqual({ key: 'saved', warn: false });
  });

  it('手动模式：脏→unsaved 警示；干净→savedManual（模式可见）', () => {
    expect(saveChipState({ autosave: false, status: 'saved', dirty: true })).toEqual({ key: 'unsaved', warn: true });
    expect(saveChipState({ autosave: false, status: 'saved', dirty: false })).toEqual({ key: 'savedManual', warn: false });
    // 手动模式下 controller 瞬时状态不参与展示
    expect(saveChipState({ autosave: false, status: 'error', dirty: false })).toEqual({ key: 'savedManual', warn: false });
  });
});

describe('resolveGuardMode（#110 关窗保护判定）', () => {
  it('手动模式有脏 → manual-dirty（三键框）', () => {
    expect(resolveGuardMode(false, true, [])).toBe('manual-dirty');
  });
  it('手动模式干净 → null（直接关）', () => {
    expect(resolveGuardMode(false, false, [])).toBeNull();
  });
  it('自动模式脏（flush 后仍脏=失败）→ 不弹（unfinished 才弹）', () => {
    expect(resolveGuardMode(true, true, [])).toBeNull();
  });
  it('手动脏 + 未完成 → merged', () => {
    expect(resolveGuardMode(false, true, ['导入向导未完成'])).toBe('merged');
  });
});
