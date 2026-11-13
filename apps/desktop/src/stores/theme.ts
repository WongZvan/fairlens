import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

/** 三态主题（§12.1）：light/dark/system 循环切换；持久化 localStorage，index.html 预挂载防闪变 */
export const useTheme = create<{
  mode: ThemeMode;
  cycle: () => void;
  /** 直接指定（视图菜单三选项用，2026-11-13 #124） */
  setMode: (mode: ThemeMode) => void;
  resolved: 'light' | 'dark';
}>((set, get) => {
  const apply = (next: ThemeMode) => {
    localStorage.setItem('fairlens.theme', next);
    const dark =
      next === 'dark' || (next === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    set({ mode: next, resolved: dark ? 'dark' : 'light' });
  };
  return {
    mode: (localStorage.getItem('fairlens.theme') as ThemeMode | null) ?? 'system',
    resolved: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    cycle: () => {
      const order: ThemeMode[] = ['light', 'dark', 'system'];
      apply(order[(order.indexOf(get().mode) + 1) % order.length]!);
    },
    setMode: apply,
  };
});
