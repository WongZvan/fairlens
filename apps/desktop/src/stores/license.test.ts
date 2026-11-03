import { beforeEach, describe, expect, it } from 'vitest';
import { useLicense } from './license.js';

/** #113 打样级激活记忆：写入 settings.license，重启（重新 hydrate）免重复弹门 */
describe('license store（打样级持久化）', () => {
  beforeEach(() => {
    useLicense.setState({ role: null, activated: false, hydrated: false });
  });

  it('activate 写入记忆；重新 hydrate 后仍是已激活', async () => {
    await useLicense.getState().activate('FL-ABCD-EFGH-IJKL');
    expect(useLicense.getState().activated).toBe(true);

    useLicense.setState({ role: null, activated: false, hydrated: false }); // 模拟重启后的内存态
    await useLicense.getState().hydrate();
    expect(useLicense.getState().hydrated).toBe(true);
    expect(useLicense.getState().activated).toBe(true);
    expect(useLicense.getState().role).toBe('user');
  });

  it('reset 清除记忆；再次 hydrate 回到未激活', async () => {
    await useLicense.getState().activate('FL-ABCD-EFGH-IJKL');
    await useLicense.getState().reset();
    expect(useLicense.getState().activated).toBe(false);

    useLicense.setState({ hydrated: false });
    await useLicense.getState().hydrate();
    expect(useLicense.getState().activated).toBe(false);
  });

  it('无记忆时 hydrate 保持未激活（首次启动弹门）', async () => {
    await useLicense.getState().reset(); // 确保清空
    useLicense.setState({ role: null, activated: false, hydrated: false });
    await useLicense.getState().hydrate();
    expect(useLicense.getState().activated).toBe(false);
    expect(useLicense.getState().hydrated).toBe(true);
  });
});
