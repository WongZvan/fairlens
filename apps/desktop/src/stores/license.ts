import { create } from 'zustand';

/** 角色门控单点（§3.5）：角色判定唯一来源=License 验签结果（M2 接入）；M0 骨架态=null（基础面） */
export type LicenseRole = 'user' | 'dev' | 'expert';

interface LicenseState {
  role: LicenseRole | null; // null=未激活（M0 恒 null）
  activated: boolean;
}

export const useLicense = create<LicenseState>(() => ({
  role: null,
  activated: false,
}));

/** 门控选择器：dev 面模块用（懒加载分包的前置判断，M4/M5 接路由） */
export const selectIsDev = (s: LicenseState) => s.role === 'dev';
