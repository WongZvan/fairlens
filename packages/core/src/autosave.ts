/**
 * 自动保存防抖状态机（§5.7 默认模式：防抖自动落盘；关闭 flush）。
 * 纯逻辑：计时器/保存回调注入，无 DOM/Tauri 依赖（packages/core 禁项）。
 * 并发模型：latest-wins 合并——保存期间的新变更在保存完成后自动续存一轮。
 */

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface AutosaveOptions<T> {
  /** 防抖毫秒（m1.6 用 800） */
  delayMs: number;
  save: (payload: T) => Promise<void>;
  onStatus?: (status: SaveStatus) => void;
  onError?: (error: unknown) => void;
}

export interface AutosaveController<T> {
  /** 记录最新值并重置防抖计时（调用方传不可变引用；同值重放=新变更轮次） */
  schedule(payload: T): void;
  /** 清计时器并同步等待落盘完成（关闭 flush 语义）；失败中止不抛出（状态置 error） */
  flush(): Promise<void>;
  /** 丢弃未落盘变更（回滚覆盖/重新打开后以新基线开始） */
  discardPending(): void;
  status(): SaveStatus;
  dirty(): boolean;
  destroy(): void;
}

export function createAutosave<T>(options: AutosaveOptions<T>): AutosaveController<T> {
  const { delayMs, save, onStatus, onError } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: T | undefined;
  let hasPending = false; // 有未落盘变更
  let running = false;
  let destroyed = false;
  let inflight: Promise<void> | null = null;
  let current: SaveStatus = 'idle';

  const setStatus = (s: SaveStatus) => {
    current = s;
    onStatus?.(s);
  };

  const runSave = (): Promise<void> => {
    if (running || !hasPending || destroyed) return Promise.resolve();
    running = true;
    setStatus('saving');
    const payload = latest as T;
    const p = (async () => {
      try {
        await save(payload);
        if (latest !== payload) {
          // 保存期间又排了新变更 → 最新值续存
          running = false;
          void runSave();
        } else {
          hasPending = false;
          running = false;
          setStatus('saved');
        }
      } catch (err) {
        // 保留 hasPending（未落盘），状态机停在 error，由调用方决定重试
        running = false;
        setStatus('error');
        onError?.(err);
      }
    })();
    inflight = p.finally(() => {
      inflight = null;
    });
    return p;
  };

  return {
    schedule(payload) {
      if (destroyed) return;
      latest = payload;
      hasPending = true;
      if (timer) clearTimeout(timer);
      setStatus('pending');
      timer = setTimeout(() => {
        timer = null;
        void runSave();
      }, delayMs);
    },

    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      while ((hasPending || running) && !destroyed) {
        if (current === 'error') break; // 落盘失败：中止避免无限重试
        if (inflight) {
          await inflight;
        } else if (hasPending) {
          await runSave();
        } else {
          break;
        }
      }
    },

    discardPending() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      latest = undefined;
      hasPending = false;
      if (current === 'pending') setStatus('saved');
    },

    status: () => current,
    dirty: () => hasPending,

    destroy() {
      destroyed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
