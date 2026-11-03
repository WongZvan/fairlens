import { describe, expect, it } from 'vitest';
import { pickAppendTarget } from './blank-click.js';

describe('pickAppendTarget（#114 点空白新增）', () => {
  const last = { entryId: 'e-last', lastEntryBottom: 600 };

  it('点在文字上 → 不追加（交给默认光标）', () => {
    expect(
      pickAppendTarget({ onText: true, hitEntry: { entryId: 'e1', lastBulletBottom: 100 }, aboveEntryInSection: null, lastEntryInDoc: last, clickY: 120 }),
    ).toBeNull();
  });

  it('点在条目容器、最后要点之下 → 追加到该条目', () => {
    expect(
      pickAppendTarget({ onText: false, hitEntry: { entryId: 'e1', lastBulletBottom: 100 }, aboveEntryInSection: null, lastEntryInDoc: last, clickY: 140 }),
    ).toBe('e1');
  });

  it('点在条目容器、最后要点之上（顶部内边距）→ 不追加', () => {
    expect(
      pickAppendTarget({ onText: false, hitEntry: { entryId: 'e1', lastBulletBottom: 100 }, aboveEntryInSection: null, lastEntryInDoc: last, clickY: 60 }),
    ).toBeNull();
  });

  it('点在两条目之间的分区空白 → 追加到上方最近条目（其最后要点之下）', () => {
    expect(
      pickAppendTarget({ onText: false, hitEntry: null, aboveEntryInSection: { entryId: 'e2', lastBulletBottom: 300 }, lastEntryInDoc: last, clickY: 330 }),
    ).toBe('e2');
  });

  it('分区空白但上方无条目 → 不追加（如 basic 区）', () => {
    expect(
      pickAppendTarget({ onText: false, hitEntry: null, aboveEntryInSection: null, lastEntryInDoc: last, clickY: 260 }),
    ).toBeNull();
  });

  it('纸面底部空白 → 追加到文档最后一个条目', () => {
    expect(
      pickAppendTarget({ onText: false, hitEntry: null, aboveEntryInSection: null, lastEntryInDoc: last, clickY: 700 }),
    ).toBe('e-last');
  });
});
