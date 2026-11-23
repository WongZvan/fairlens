import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeDoc } from '@fairlens/shared';
import { useEditorDoc } from './editor-doc.js';

/** m1.6 编辑器文档 store 全链路（memory adapter + 防抖状态机） */

const doc = (): ResumeDoc => ({
  templateId: 'tpl-classic',
  sections: [
    { id: 'Ab3kZ9pQ2xY1', type: 'basic', title: '基本信息', basicFields: [], entries: [] },
    {
      id: 'Cd4lA0qR3zX2',
      type: 'experience',
      title: '实习经历',
      entries: [{ id: 'Ef5mB1sT4aY3', org: '字节跳动', bullets: [{ id: 'Gh6nC2uU5bZ4', runs: [{ text: '要点' }] }] }],
    },
  ],
});

/** m1.8：库页显式打开；测试里“重开”=按第一份 meta 再开一次（空库先补一份夹具） */
async function openDoc(): Promise<boolean> {
  const { persistence } = await import('../lib/persistence/index.js');
  const metas = await persistence().listResumeMetas();
  if (metas.length) return useEditorDoc.getState().openResume(metas[0]!.id);
  const now = new Date().toISOString();
  const id = 'TestResume01';
  await persistence().upsertResume({
    id,
    title: '测试简历',
    verticalId: 'general',
    doc: doc(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return useEditorDoc.getState().openResume(id);
}

describe('editor-doc store（§5.7 双模式 + 快照）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorDoc.setState({ ready: false, doc: null, dirty: false, lastError: null });
  });
  afterEach(() => vi.useRealTimers());

  it('openResume：打开已存在简历；不存在的 id 返回 false 且不播种替身', async () => {
    expect(await useEditorDoc.getState().openResume('NoSuchResume1')).toBe(false);
    expect(useEditorDoc.getState().ready).toBe(false);

    expect(await openDoc()).toBe(true);
    const s1 = useEditorDoc.getState();
    expect(s1.ready).toBe(true);
    expect(s1.resumeId).toBeTruthy();
    expect(s1.doc?.templateId).toBe('tpl-classic');
    expect(s1.autosave).toBe(true); // settings 默认（§5.7 默认开）

    const firstId = s1.resumeId;
    expect(await openDoc()).toBe(true); // 重开=同一份
    expect(useEditorDoc.getState().resumeId).toBe(firstId);
  });

  it('自动模式：applyDoc 防抖 800ms 落盘；重开读回新内容', async () => {
    await openDoc();
    const changed = doc();
    changed.sections[1]!.entries[0]!.org = '腾讯';
    useEditorDoc.getState().applyDoc(changed);
    expect(useEditorDoc.getState().saveStatus).toBe('pending');
    await vi.advanceTimersByTimeAsync(800);
    expect(useEditorDoc.getState().saveStatus).toBe('saved');
    expect(useEditorDoc.getState().dirty).toBe(false);

    await openDoc(); // 重开读回
    expect(useEditorDoc.getState().doc?.sections[1]!.entries[0]!.org).toBe('腾讯');
  });

  it('手动模式（autosave=false）：applyDoc 只标 dirty；saveNow 落盘', async () => {
    await openDoc();
    const { persistence } = await import('../lib/persistence/index.js');
    await persistence().setSettingRaw('autosave', false);
    await openDoc(); // 重读 settings
    expect(useEditorDoc.getState().autosave).toBe(false);

    const changed = doc();
    changed.sections[1]!.entries[0]!.org = '阿里';
    useEditorDoc.getState().applyDoc(changed);
    expect(useEditorDoc.getState().dirty).toBe(true);
    await vi.advanceTimersByTimeAsync(2000); // 不自动落盘
    expect(useEditorDoc.getState().dirty).toBe(true);

    await useEditorDoc.getState().saveNow(); // Ctrl+S
    expect(useEditorDoc.getState().dirty).toBe(false);
    expect(useEditorDoc.getState().doc?.sections[1]!.entries[0]!.org).toBe('阿里');
  });

  it('手动模式：flushPending 不得清掉未保存标记（#110 关窗保护回归）', async () => {
    await openDoc();
    const { persistence } = await import('../lib/persistence/index.js');
    await persistence().setSettingRaw('autosave', false);
    await openDoc(); // 重读 settings → autosave=false

    const changed = doc();
    changed.sections[1]!.entries[0]!.org = '百度';
    useEditorDoc.getState().applyDoc(changed);
    expect(useEditorDoc.getState().dirty).toBe(true);

    await useEditorDoc.getState().flushPending(); // 关窗/返回库前的 flush
    expect(useEditorDoc.getState().dirty).toBe(true); // 手动模式必须保留 dirty → 触发三键框
  });

  it('setAutosave(false)：先把挂起的自动保存落盘，再把旧计时器清零（#110）', async () => {
    const { persistence } = await import('../lib/persistence/index.js');
    await persistence().setSettingRaw('autosave', true); // 前序用例可能已改设置，显式复位
    await openDoc();
    expect(useEditorDoc.getState().autosave).toBe(true);
    const changed = doc();
    changed.sections[1]!.entries[0]!.org = '小米';
    useEditorDoc.getState().applyDoc(changed); // 自动模式：进入防抖等待
    expect(useEditorDoc.getState().dirty).toBe(true);

    await useEditorDoc.getState().setAutosave(false); // 切手动：应先落盘
    expect(useEditorDoc.getState().autosave).toBe(false);
    expect(useEditorDoc.getState().dirty).toBe(false); // 落盘完成

    // 切回自动再编辑 → 防抖保存恢复
    await useEditorDoc.getState().setAutosave(true);
    const again = doc();
    again.sections[1]!.entries[0]!.org = '网易';
    useEditorDoc.getState().applyDoc(again);
    expect(useEditorDoc.getState().dirty).toBe(true);
    await vi.advanceTimersByTimeAsync(800);
    expect(useEditorDoc.getState().dirty).toBe(false);
    expect(useEditorDoc.getState().doc?.sections[1]!.entries[0]!.org).toBe('网易');
  });

  it('手动模式：内容改回基线后 dirty=false（修复"删掉新要点仍弹三键框"）', async () => {
    await openDoc();
    const { persistence } = await import('../lib/persistence/index.js');
    await persistence().setSettingRaw('autosave', false);
    await openDoc();
    const base = useEditorDoc.getState().doc!;

    // 模拟"新建要点"：深拷贝后追加一条
    const added = structuredClone(base);
    added.sections[1]!.entries[0]!.bullets.push({ id: 'Bul000000001', runs: [{ text: '临时' }] });
    useEditorDoc.getState().applyDoc(added);
    expect(useEditorDoc.getState().dirty).toBe(true);

    // 模拟"再删掉"：回到与基线完全相同的内容（键序可能不同，必须仍判等）
    const reverted = structuredClone(base);
    useEditorDoc.getState().applyDoc(reverted);
    expect(useEditorDoc.getState().dirty).toBe(false);
  });

  it('手动模式：discardPendingChanges 把文档复位到最后保存版本', async () => {
    await openDoc();
    const { persistence } = await import('../lib/persistence/index.js');
    await persistence().setSettingRaw('autosave', false);
    await openDoc();
    const base = useEditorDoc.getState().doc!;

    const changed = structuredClone(base);
    changed.sections[1]!.entries[0]!.org = '不该留下';
    useEditorDoc.getState().applyDoc(changed);
    expect(useEditorDoc.getState().dirty).toBe(true);

    useEditorDoc.getState().discardPendingChanges();
    expect(useEditorDoc.getState().dirty).toBe(false);
    expect(useEditorDoc.getState().doc).toEqual(base);
  });

  it('快照：createSnapshot→listSnapshots→restoreSnapshot 立即落盘回滚内容', async () => {
    await openDoc();
    const base = useEditorDoc.getState().doc!;
    await useEditorDoc.getState().createSnapshot();

    const changed = doc();
    changed.templateId = 'tpl-duo';
    changed.sections[1]!.entries[0]!.org = '美团';
    useEditorDoc.getState().applyDoc(changed);
    await useEditorDoc.getState().saveNow();

    const snaps = await useEditorDoc.getState().listSnapshots();
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.trigger).toBe('manual');

    await useEditorDoc.getState().restoreSnapshot(snaps[0]!.id);
    expect(useEditorDoc.getState().doc?.templateId).toBe('tpl-classic');
    expect(useEditorDoc.getState().doc).toEqual(base);
    // 回滚立即落盘：重开读回仍是快照内容
    await openDoc();
    expect(useEditorDoc.getState().doc?.templateId).toBe('tpl-classic');

    // 快照留档：可再回滚回「美团」版本
    const after = await useEditorDoc.getState().listSnapshots();
    expect(after).toHaveLength(1);
  });
});
