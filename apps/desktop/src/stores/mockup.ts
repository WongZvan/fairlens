import { create } from 'zustand';

/** m1.1 打样态：模板切换/缩放/面板折叠（M1 后续模块将替换为真实编辑器状态） */
export type MockTemplate = 'classic' | 'duo';

interface MockupState {
  template: MockTemplate;
  zoom: number; // 0.5–1.5
  leftOpen: boolean;
  rightOpen: boolean;
  setTemplate: (t: MockTemplate) => void;
  setZoom: (z: number) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
}

export const useMockup = create<MockupState>((set) => ({
  template: 'classic',
  zoom: 0.92,
  leftOpen: true,
  rightOpen: true,
  setTemplate: (template) => set({ template }),
  setZoom: (zoom) => set({ zoom: Math.min(1.5, Math.max(0.5, Math.round(zoom * 10) / 10)) }),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
}));
