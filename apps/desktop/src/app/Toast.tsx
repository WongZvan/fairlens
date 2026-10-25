import { useEffect, useState } from 'react';

/** 极简 toast（m1.6：Ctrl+S/快照反馈；§5.6）——全局函数 + 宿主组件挂 AppShell */
let push: ((msg: string) => void) | null = null;

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
    push = (msg) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, msg }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2200);
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
