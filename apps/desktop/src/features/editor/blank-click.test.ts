import { describe, expect, it } from 'vitest';
import { pickClickTarget, type EntryBox, type SectionBox } from './blank-click.js';

const entry = (entryId: string, top: number, bulletBottoms: number[]): EntryBox => ({
  entryId,
  top,
  bottom: (bulletBottoms[bulletBottoms.length - 1] ?? top) + 10,
  bulletBottoms,
});

describe('pickClickTarget（#127 空白点击全量）', () => {
  it('点在文字上 → null（交给默认光标）', () => {
    expect(pickClickTarget({ onText: true, hitEntry: entry('e1', 0, [100]), section: null, clickY: 120 })).toBeNull();
  });

  it('条目内、最后要点之下 → 追加要点', () => {
    expect(
      pickClickTarget({ onText: false, hitEntry: entry('e1', 0, [100, 200]), section: null, clickY: 220 }),
    ).toEqual({ kind: 'append-bullet', entryId: 'e1' });
  });

  it('条目内、两条要点之间 → 在该位置插入要点', () => {
    expect(
      pickClickTarget({ onText: false, hitEntry: entry('e1', 0, [100, 200, 300]), section: null, clickY: 150 }),
    ).toEqual({ kind: 'insert-bullet', entryId: 'e1', index: 1 });
  });

  it('条目内、标题与首条要点之间 → 插到第 0 条之前', () => {
    expect(
      pickClickTarget({ onText: false, hitEntry: entry('e1', 0, [100, 200]), section: null, clickY: 40 }),
    ).toEqual({ kind: 'insert-bullet', entryId: 'e1', index: 0 });
  });

  it('条目内、没有任何要点 → 插入第一条要点', () => {
    expect(
      pickClickTarget({ onText: false, hitEntry: entry('e1', 0, []), section: null, clickY: 20 }),
    ).toEqual({ kind: 'append-bullet', entryId: 'e1' });
  });

  it('两条条目之间 → 在该位置插入新条目', () => {
    const section: SectionBox = { sectionId: 's1', entries: [entry('e1', 100, [180]), entry('e2', 400, [480])] };
    expect(pickClickTarget({ onText: false, hitEntry: null, section, clickY: 300 })).toEqual({
      kind: 'insert-entry',
      sectionId: 's1',
      index: 1,
    });
  });

  it('分区底部空白 → 追加新条目到末尾', () => {
    const section: SectionBox = { sectionId: 's1', entries: [entry('e1', 100, [180])] };
    expect(pickClickTarget({ onText: false, hitEntry: null, section, clickY: 500 })).toEqual({
      kind: 'insert-entry',
      sectionId: 's1',
      index: 1,
    });
  });

  it('空分区 → 插入第一条条目', () => {
    expect(pickClickTarget({ onText: false, hitEntry: null, section: { sectionId: 's1', entries: [] }, clickY: 200 })).toEqual({
      kind: 'insert-entry',
      sectionId: 's1',
      index: 0,
    });
  });

  it('纸面灰区（不属于任何分区）→ 不响应', () => {
    expect(pickClickTarget({ onText: false, hitEntry: null, section: null, clickY: 900 })).toBeNull();
  });
});
