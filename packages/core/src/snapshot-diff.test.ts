import { describe, expect, it } from 'vitest';
import type { ResumeDoc } from '@fairlens/shared';
import { alignBlockDiff } from './snapshot-diff.js';

const ids = {
  secBasic: 'Ab3kZ9pQ2xY1',
  secExp: 'Cd4lA0qR3zX2',
  field1: 'Ij7oD3vV6cA5',
  entry1: 'Ef5mB1sT4aY3',
  bullet1: 'Gh6nC2uU5bZ4',
};

const doc = (): ResumeDoc => ({
  templateId: 'tpl-classic',
  sections: [
    {
      id: ids.secBasic,
      type: 'basic',
      title: '基本信息',
      basicFields: [{ id: ids.field1, label: '邮箱', value: 'a@b.c' }],
      entries: [],
    },
    {
      id: ids.secExp,
      type: 'experience',
      title: '实习经历',
      entries: [
        {
          id: ids.entry1,
          org: '字节跳动',
          role: '产品实习生',
          start: '2025.06',
          end: '2025.09',
          bullets: [{ id: ids.bullet1, runs: [{ text: '输出 12 份报告' }] }],
        },
      ],
    },
  ],
});

describe('alignBlockDiff（§5.6 快照对比）', () => {
  it('全等文档 → 无变更，全部 unchanged', () => {
    const d = alignBlockDiff(doc(), doc());
    expect(d.hasChanges).toBe(false);
    expect(d.counts).toEqual({ unchanged: 5, changed: 0, added: 0, removed: 0 });
  });

  it('改 bullet 文本 → 该 bullet changed，父 entry/section 不冒泡', () => {
    const target = doc();
    target.sections[1]!.entries[0]!.bullets[0]!.runs[0]!.text = '改后的要点';
    const d = alignBlockDiff(doc(), target);
    expect(d.counts.changed).toBe(1);
    const item = d.items.find((i) => i.id === ids.bullet1)!;
    expect(item.status).toBe('changed');
    expect(item.kind).toBe('bullet');
    expect(item.sectionId).toBe(ids.secExp);
  });

  it('新增 entry → added；删除 bullet → removed（快照有而当前无）', () => {
    const added = doc();
    added.sections[1]!.entries.push({
      id: 'Mn8pE4wW7dB6',
      org: '新公司',
      bullets: [{ id: 'Oq9qF5xX8eC7', runs: [{ text: '新要点' }] }],
    });
    const d1 = alignBlockDiff(doc(), added);
    expect(d1.counts.added).toBe(2); // entry + bullet
    expect(d1.items.filter((i) => i.status === 'added').map((i) => i.id)).toEqual(['Mn8pE4wW7dB6', 'Oq9qF5xX8eC7']);

    const removed = doc();
    removed.sections[1]!.entries[0]!.bullets = [];
    const d2 = alignBlockDiff(doc(), removed);
    expect(d2.counts.removed).toBe(1);
    expect(d2.items.find((i) => i.status === 'removed')!.id).toBe(ids.bullet1);
  });

  it('换模板/样式 → doc 级 changed（回滚恢复模板归属）', () => {
    const target = { ...doc(), templateId: 'tpl-duo' };
    const d = alignBlockDiff(doc(), target);
    expect(d.items[0]).toMatchObject({ kind: 'doc', status: 'changed' });
  });

  it('section 标题改 / basicField 值改 → 各自 changed', () => {
    const t1 = doc();
    t1.sections[0]!.title = '基本信息（改）';
    expect(alignBlockDiff(doc(), t1).items.find((i) => i.id === ids.secBasic)!.status).toBe('changed');

    const t2 = doc();
    t2.sections[0]!.basicFields![0]!.value = 'new@b.c';
    expect(alignBlockDiff(doc(), t2).items.find((i) => i.id === ids.field1)!.status).toBe('changed');
  });

  it('回滚 round-trip：以快照为基线 diff 当前 → 回滚后归零', () => {
    const snapshot = doc();
    const current = doc();
    current.templateId = 'tpl-duo';
    current.sections[1]!.entries[0]!.org = '腾讯';
    current.sections[1]!.entries.push({ id: 'Mn8pE4wW7dB6', org: '新公司', bullets: [] });

    const before = alignBlockDiff(snapshot, current);
    expect(before.hasChanges).toBe(true);

    const afterRollback = alignBlockDiff(snapshot, snapshot); // 回滚=以快照 doc 覆盖当前
    expect(afterRollback.hasChanges).toBe(false);
    void before;
  });
});
