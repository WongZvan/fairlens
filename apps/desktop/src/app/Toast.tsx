import { useEffect, useState } from 'react';

/**
 * 极简 toast（m1.6；#127 打磨）：
 * - 宿主 pointer-events:none，不再在状态栏上方形成点击拦截带；
 * - 时长按文案长度 2.2–6s（长提示来得及读完）；
 * - 1 秒内同文去重（连点保存不叠一摞）；
 * - aria-live 播报保留。
 */
let push: ((msg: string) => void) | null = null;

/** 纯函数便于单测：时长 = 2.2s 起，每字 40ms，封顶 6s */
export function toastDurationMs(msg: string): number {
  return Math.min(6000, 2200 + Math.max(0, msg.length) * 40);
}

export function toast(msg: string) {
  push?.(msg);
}

interface ToastItem {
  id: number;
  msg: string;
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let last: { msg: string; at: number } | null = null;
    push = (msg) => {
      const now = Date.now();
      if (last && last.msg === msg && now - last.at < 1000) return; // 同文 1s 内去重
      last = { msg, at: now };
      const id = now + Math.random();
      setItems((xs) => [...xs, { id, msg }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), toastDurationMs(msg));
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((x) => (
        <div key={x.id} className="toast">{x.msg}</div>
      ))}
    </div>
  );
}
