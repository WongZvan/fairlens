import { create } from 'zustand';

/** 打样态：模板切换/缩放/面板折叠（M1 后续模块替换为真实编辑器状态） */
export type MockTemplate = 'classic' | 'duo';

/** #90-② 缩放模式：'fit-width'=适应宽度（动态，默认）/ 'fit-page'=适应整页 / number=固定倍率（1=实际尺寸） */
export type ZoomMode = 'fit-width' | 'fit-page' | number;

interface MockupState {
  template: MockTemplate;
  zoomMode: ZoomMode;
  /** 实际渲染倍率（fit 模式下由容器测量动态解析；供渲染层直接消费） */
  zoom: number;
  leftOpen: boolean;
  rightOpen: boolean;
  setTemplate: (t: MockTemplate) => void;
  setZoomMode: (m: ZoomMode) => void;
  setResolvedZoom: (z: number) => void; // fit 模式的动态解析写入
  bumpZoom: (delta: number) => void; // Ctrl+滚轮/±按钮：离开 fit 模式进固定档
  toggleLeft: () => void;
  toggleRight: () => void;
}

// 固定档量化到 10% 步进；fit 解析值保留 1% 精度（铺满差 0.3% 也别拍回整数档）
const quantize = (z: number) => Math.min(1.5, Math.max(0.5, Math.round(z * 10) / 10));
const quantizeFit = (z: number) => Math.min(1.5, Math.max(0.5, Math.round(z * 100) / 100));

export const useMockup = create<MockupState>((set) => ({
  template: 'classic',
  zoomMode: 'fit-width', // 默认适应宽度（#90）
  zoom: 1,
  leftOpen: true,
  rightOpen: true,
  setTemplate: (template) => set({ template }),
  setZoomMode: (zoomMode) => set({ zoomMode }),
  setResolvedZoom: (zoom) => set({ zoom: quantizeFit(zoom) }),
  bumpZoom: (delta) => set((s) => ({ zoomMode: quantize(s.zoom + delta), zoom: quantize(s.zoom + delta) })),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
}));
