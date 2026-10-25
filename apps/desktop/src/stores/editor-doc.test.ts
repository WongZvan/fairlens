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

describe('editor-doc store（§5.7 双模式 + 快照）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorDoc.setState({ ready: false, doc: null, dirty: false, lastError: null });
  });
  afterEach(() => vi.useRealTimers());

  it('openCurrent：空库建示例简历并就绪；重开读回最近编辑行', async () => {
    await useEditorDoc.getState().openCurrent();
    const s1 = useEditorDoc.getState();
    expect(s1.ready).toBe(true);
    expect(s1.resumeId).toBeTruthy();
    expect(s1.doc?.templateId).toBe('tpl-classic');
    expect(s1.autosave).toBe(true); // settings 默认（§5.7 默认开）

    const firstId = s1.resumeId;
    await useEditorDoc.getState().openCurrent(); // 重开=最近编辑行（同一份）
    expect(useEditorDoc.getState().resumeId).toBe(firstId);
  });

  it('自动模式：applyDoc 防抖 800ms 落盘；重开读回新内容', async () => {
    await useEditorDoc.getState().openCurrent();
    const changed = doc();
    changed.sections[1]!.entries[0]!.org = '腾讯';
    useEditorDoc.getState().applyDoc(changed);
    expect(useEditorDoc.getState().saveStatus).toBe('pending');
    await vi.advanceTimersByTimeAsync(800);
    expect(useEditorDoc.getState().saveStatus).toBe('saved');
    expect(useEditorDoc.getState().dirty).toBe(false);

    await useEditorDoc.getState().openCurrent(); // 重开读回
    expect(useEditorDoc.getState().doc?.sections[1]!.entries[0]!.org).toBe('腾讯');
  });

  it('手动模式（autosave=false）：applyDoc 只标 dirty；saveNow 落盘', async () => {
    await useEditorDoc.getState().openCurrent();
    const { persistence } = await import('../lib/persistence/index.js');
    await persistence().setSettingRaw('autosave', false);
    await useEditorDoc.getState().openCurrent(); // 重读 settings
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

  it('快照：createSnapshot→listSnapshots→restoreSnapshot 立即落盘回滚内容', async () => {
    await useEditorDoc.getState().openCurrent();
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
    await useEditorDoc.getState().openCurrent();
    expect(useEditorDoc.getState().doc?.templateId).toBe('tpl-classic');

    // 快照留档：可再回滚回「美团」版本
    const after = await useEditorDoc.getState().listSnapshots();
    expect(after).toHaveLength(1);
  });
});
