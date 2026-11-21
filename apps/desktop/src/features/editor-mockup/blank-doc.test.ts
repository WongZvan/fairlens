import { describe, expect, it } from 'vitest';
import { ResumeDoc } from '@fairlens/shared';
import { createBlankDoc } from './blank-doc.js';

describe('createBlankDoc（#127 清空为空白简历；#128 姓名可空）', () => {
  const doc = createBlankDoc({ basicSection: '基本信息' });

  it('产出通过契约校验（sections.min(1) / title.min(1)）', () => {
    expect(() => ResumeDoc.parse(doc)).not.toThrow();
  });

  it('只有一个空的基本信息分区，没有示例条目', () => {
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]!.entries).toEqual([]);
    expect(doc.sections[0]!.title).toBe('基本信息');
  });

  it('数据层不编造姓名（空串；画布占位由 UI 负责）', () => {
    expect(doc.profile?.name).toBe('');
  });

  it('区块 id 每次新建都不同（避免快照/批注锚点冲突）', () => {
    const again = createBlankDoc({ basicSection: '基本信息' });
    expect(again.sections[0]!.id).not.toBe(doc.sections[0]!.id);
  });
});
