import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosave, type SaveStatus } from './autosave.js';

describe('createAutosave（§5.7 防抖状态机）', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (save: (payload: string) => Promise<void> = async () => {}) => {
    const statuses: SaveStatus[] = [];
    const ctl = createAutosave<string>({
      delayMs: 800,
      save,
      onStatus: (s) => statuses.push(s),
    });
    return { ctl, statuses };
  };

  it('防抖：delay 内不保存，到点保存最新值', async () => {
    const save = vi.fn(async () => {});
    const { ctl } = setup(save);
    ctl.schedule('v1');
    await vi.advanceTimersByTimeAsync(500);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('v1');
    expect(ctl.status()).toBe('saved');
    expect(ctl.dirty()).toBe(false);
  });

  it('连续 schedule 合并为最后一次', async () => {
    const save = vi.fn(async () => {});
    const { ctl } = setup(save);
    ctl.schedule('v1');
    await vi.advanceTimersByTimeAsync(300);
    ctl.schedule('v2');
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenLastCalledWith('v2');
  });

  it('flush 立即落盘（关闭 flush 语义）', async () => {
    const save = vi.fn(async () => {});
    const { ctl } = setup(save);
    ctl.schedule('v1');
    await ctl.flush();
    expect(save).toHaveBeenCalledOnce();
    expect(ctl.status()).toBe('saved');
  });

  it('保存期间的新变更自动续存一轮（latest-wins）', async () => {
    let resolveFirst!: () => void;
    const save = vi.fn((p: string) =>
      p === 'v1'
        ? new Promise<void>((r) => {
            resolveFirst = r;
          })
        : Promise.resolve(),
    );
    const { ctl } = setup(save);
    ctl.schedule('v1');
    await vi.advanceTimersByTimeAsync(800);
    expect(ctl.status()).toBe('saving');
    ctl.schedule('v2'); // 保存 v1 期间来了新变更
    resolveFirst();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith('v2');
    expect(ctl.status()).toBe('saved');
  });

  it('save 失败 → 状态 error 且保持 dirty；flush 中止不无限重试', async () => {
    const save = vi.fn(async () => {
      throw new Error('db locked');
    });
    const errors: unknown[] = [];
    const ctl = createAutosave<string>({ delayMs: 800, save, onError: (e) => errors.push(e) });
    ctl.schedule('v1');
    await vi.advanceTimersByTimeAsync(800);
    expect(ctl.status()).toBe('error');
    expect(ctl.dirty()).toBe(true);
    await ctl.flush(); // 必须终止而非死循环
    expect(save).toHaveBeenCalledOnce();
    expect(errors).toHaveLength(1);
  });

  it('flush 等待进行中的保存完成后落盘新变更', async () => {
    let resolveFirst!: () => void;
    let first = true;
    const save = vi.fn(
      () =>
        new Promise<void>((r) => {
          if (first) {
            first = false;
            resolveFirst = r;
          } else {
            r();
          }
        }),
    );
    const { ctl } = setup(save);
    ctl.schedule('v1');
    await vi.advanceTimersByTimeAsync(800);
    ctl.schedule('v2');
    const flushed = ctl.flush();
    resolveFirst();
    await flushed;
    expect(ctl.dirty()).toBe(false);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('destroy 后 schedule 失效', async () => {
    const save = vi.fn(async () => {});
    const { ctl } = setup(save);
    ctl.destroy();
    ctl.schedule('v1');
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
  });

  it('discardPending 丢弃未落盘变更', () => {
    const save = vi.fn(async () => {});
    const { ctl } = setup(save);
    ctl.schedule('v1');
    expect(ctl.dirty()).toBe(true);
    ctl.discardPending();
    expect(ctl.dirty()).toBe(false);
    expect(ctl.status()).toBe('saved');
  });
});
