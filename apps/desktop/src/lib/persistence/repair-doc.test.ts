import { describe, expect, it } from 'vitest';
import { repairResumeDoc } from './repair-doc.js';

const validDoc = {
  templateId: 'tpl-classic',
  sections: [
    {
      id: 'Ab3kZ9pQ2xY1',
      type: 'experience' as const,
      title: '实习经历',
      entries: [
        {
          id: 'Ef5mB1sT4aY3',
          org: '字节跳动',
          bullets: [
            { id: 'Gh6nC2uU5bZ4', runs: [{ text: '要点一' }] },
            { id: 'Ij7oD3vV6cA5', runs: [] }, // 旧版缺陷：空 runs
          ],
        },
      ],
    },
  ],
};

describe('repairResumeDoc（#109 旧数据修复）', () => {
  it('丢弃空 runs 的 bullet，保留合法 bullet', () => {
    const fixed = repairResumeDoc(validDoc);
    expect(fixed).not.toBeNull();
    expect(fixed!.sections[0]!.entries[0]!.bullets).toHaveLength(1);
    expect(fixed!.sections[0]!.entries[0]!.bullets[0]!.runs[0]!.text).toBe('要点一');
  });

  it('非对象/无 sections 返回 null（调用方走兜底新建）', () => {
    expect(repairResumeDoc(null)).toBeNull();
    expect(repairResumeDoc('x')).toBeNull();
    expect(repairResumeDoc({ templateId: 't' })).toBeNull();
  });

  it('结构合法但内容非法（缺 templateId）时返回 null', () => {
    expect(repairResumeDoc({ sections: [] })).toBeNull();
  });

  it('合法文档原样通过', () => {
    const ok = { templateId: 'tpl-classic', sections: [{ id: 'Ab3kZ9pQ2xY1', type: 'basic', title: '基本信息', entries: [] }] };
    const fixed = repairResumeDoc(ok);
    expect(fixed).not.toBeNull();
    expect(fixed!.sections).toHaveLength(1);
  });

  it('数字日期（旧版把 2022.09 存成浮点）归一为字符串', () => {
    const broken = {
      templateId: 'tpl-classic',
      sections: [
        {
          id: 'Cd4lA0qR3zX2',
          type: 'education' as const,
          title: '教育经历',
          entries: [
            {
              id: 'Ef5mB1sT4aY3',
              org: '华中科技大学',
              start: 2022.09,
              end: 2026.06,
              bullets: [{ id: 'Gh6nC2uU5bZ4', runs: [{ text: 'GPA 3.6' }] }],
            },
          ],
        },
      ],
    };
    const fixed = repairResumeDoc(broken);
    expect(fixed).not.toBeNull();
    expect(fixed!.sections[0]!.entries[0]!.start).toBe('2022.09');
    expect(fixed!.sections[0]!.entries[0]!.end).toBe('2026.06');
  });

  it('真实损坏样本：entries 里混入 null（旧换序越界写入）+ 0 要点条目 + 重复 section → 可修复', () => {
    const broken = {
      templateId: 'tpl-classic',
      sections: [
        { id: 'Ab3kZ9pQ2xY1', type: 'experience', title: '实习经历', entries: [{ id: 'Ef5mB1sT4aY3', org: '字节跳动', bullets: [] }, null] },
        { id: 'Cd4lA0qR3zX2', type: 'experience', title: '实习经历', entries: [{ id: 'Gh6nC2uU5bZ4', org: '美团', bullets: [{ id: 'Ij7oD3vV6cA5', runs: [{ text: '要点' }] }] }] },
      ],
    };
    const fixed = repairResumeDoc(broken);
    expect(fixed).not.toBeNull();
    expect(fixed!.sections).toHaveLength(2);
    expect(fixed!.sections[0]!.entries).toHaveLength(1); // null 条目被剔除
    expect(fixed!.sections[0]!.entries[0]!.org).toBe('字节跳动');
    expect(fixed!.sections[1]!.entries[0]!.bullets).toHaveLength(1);
  });
});
