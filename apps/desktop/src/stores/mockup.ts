import { create } from 'zustand';
import { toggleCollapsed } from '../features/editor-mockup/outline-collapse.js';

/** 打样态：缩放/面板折叠（M1 后续模块替换为真实编辑器状态；模板归 ResumeDoc） */
export type ZoomMode = 'fit-width' | 'fit-page' | number;

interface MockupState {
  zoomMode: ZoomMode;
  /** 实际渲染倍率（fit 模式下由容器测量动态解析；供渲染层直接消费） */
  zoom: number;
  leftOpen: boolean;
  rightOpen: boolean;
  /** 大纲分区折叠（localStorage 记忆；只影响大纲视图） */
  collapsedSections: string[];
  /** 侧栏宽度（px，拖拽调宽；localStorage 记忆） */
  leftWidth: number;
  rightWidth: number;
  setZoomMode: (m: ZoomMode) => void;
  setResolvedZoom: (z: number) => void; // fit 模式的动态解析写入
  bumpZoom: (delta: number) => void; // Ctrl+滚轮/±按钮：离开 fit 模式进固定档
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleSection: (id: string) => void;
  setLeftWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
}

// 固定档量化到 10% 步进；fit 解析值保留 1% 精度（铺满差 0.3% 也别拍回整数档）
const quantize = (z: number) => Math.min(1.5, Math.max(0.5, Math.round(z * 10) / 10));
const quantizeFit = (z: number) => Math.min(1.5, Math.max(0.5, Math.round(z * 100) / 100));

const SIDEBAR_LS = { leftWidth: 'fairlens.leftWidth', rightWidth: 'fairlens.rightWidth' };
const COLLAPSED_LS = 'fairlens.collapsedSections';
const clampW = (w: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(w)));
const readCollapsed = (): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(COLLAPSED_LS) ?? '[]');
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export const useMockup = create<MockupState>((set) => ({
  zoomMode: 'fit-width', // 默认适应宽度（#90）
  zoom: 1,
  leftOpen: true,
  rightOpen: true,
  collapsedSections: readCollapsed(),
  leftWidth: clampW(Number(localStorage.getItem(SIDEBAR_LS.leftWidth)) || 208, 150, 320),
  rightWidth: clampW(Number(localStorage.getItem(SIDEBAR_LS.rightWidth)) || 296, 220, 420),
  setZoomMode: (zoomMode) => set({ zoomMode }),
  setResolvedZoom: (zoom) => set({ zoom: quantizeFit(zoom) }),
  bumpZoom: (delta) => set((s) => ({ zoomMode: quantize(s.zoom + delta), zoom: quantize(s.zoom + delta) })),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  toggleSection: (id) =>
    set((s) => {
      const collapsedSections = toggleCollapsed(s.collapsedSections, id);
      localStorage.setItem(COLLAPSED_LS, JSON.stringify(collapsedSections));
      return { collapsedSections };
    }),
  setLeftWidth: (w) => {
    const leftWidth = clampW(w, 150, 320);
    localStorage.setItem(SIDEBAR_LS.leftWidth, String(leftWidth));
    set({ leftWidth });
  },
  setRightWidth: (w) => {
    const rightWidth = clampW(w, 220, 420);
    localStorage.setItem(SIDEBAR_LS.rightWidth, String(rightWidth));
    set({ rightWidth });
  },
}));
