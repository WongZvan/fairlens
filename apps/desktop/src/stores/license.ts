import { create } from 'zustand';
import { LicenseMemory } from '@fairlens/shared';
import { persistence } from '../lib/persistence/index.js';

/**
 * 角色门控单点（§3.5）：角色判定唯一来源=License 验签结果（M2 接入）；M0 骨架态=null（基础面）。
 * #113：打样级持久化——已激活写入 settings.license，重启免重复弹门；**非授权凭据**（真验签+设备指纹+解绑=M2）。
 */
export type LicenseRole = 'user' | 'dev' | 'expert';

interface LicenseState {
  role: LicenseRole | null; // null=未激活
  activated: boolean;
  /** 启动时是否已从本地读回激活记忆（AppShell 据此避免门闪烁） */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  activate: (code?: string) => Promise<void>;
  /** 重置激活（打样态：仅清本机记忆；真解绑=M2） */
  reset: () => Promise<void>;
}

export const useLicense = create<LicenseState>((set) => ({
  role: null,
  activated: false,
  hydrated: false,

  async hydrate() {
    try {
      const raw = await persistence().getSettingRaw('license');
      const parsed = LicenseMemory.safeParse(raw);
      if (parsed.success) set({ role: 'user', activated: true });
    } catch (err) {
      console.warn('[license] 读取激活记忆失败（按未激活处理）', err);
    } finally {
      set({ hydrated: true });
    }
  },

  async activate(code) {
    // 打样态：格式通过即视为激活（真验签+KV 占席=m2.2/m2.3 接管）
    set({ role: 'user', activated: true });
    try {
      await persistence().setSettingRaw('license', { activatedAt: new Date().toISOString(), code });
    } catch (err) {
      // 记忆写入失败不影响本次使用，但下次仍需输入
      console.warn('[license] 激活记忆写入失败', err);
    }
  },

  async reset() {
    set({ role: null, activated: false });
    try {
      await persistence().deleteSetting('license');
    } catch (err) {
      console.warn('[license] 清除激活记忆失败', err);
    }
  },
}));

/** 门控选择器：dev 面模块用（懒加载分包的前置判断，M4/M5 接路由） */
export const selectIsDev = (s: LicenseState) => s.role === 'dev';
