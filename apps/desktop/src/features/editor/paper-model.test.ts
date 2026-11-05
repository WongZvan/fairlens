import { describe, expect, it } from 'vitest';
import type { Section } from '@fairlens/shared';
import { partitionSections, sortSectionsByOrder } from './paper-model.js';

const sec = (id: string, type: Section['type']): Section => ({
  id,
  type,
  title: id,
  entries: [],
});

describe('纸面分区模型（#117）', () => {
  it('duo 分组：basic/skill → side，education/experience/project → main', () => {
    const { side, main } = partitionSections([
      sec('SecBas000001', 'basic'),
      sec('SecEdu000001', 'education'),
      sec('SecExp000001', 'experience'),
      sec('SecPro000001', 'project'),
      sec('SecSki000001', 'skill'),
    ]);
    expect(side.map((s) => s.type)).toEqual(['basic', 'skill']);
    expect(main.map((s) => s.type)).toEqual(['education', 'experience', 'project']);
  });

  it('分组保持组内原顺序', () => {
    const { side, main } = partitionSections([
      sec('SecSki000001', 'skill'),
      sec('SecEdu000001', 'education'),
      sec('SecBas000001', 'basic'),
    ]);
    expect(side.map((s) => s.id)).toEqual(['SecSki000001', 'SecBas000001']);
    expect(main.map((s) => s.id)).toEqual(['SecEdu000001']);
  });

  it('按内部 order 稳定排序；无 order 的排在有 order 之后', () => {
    const sorted = sortSectionsByOrder([
      { id: 'b', order: 2 },
      { id: 'no-order' },
      { id: 'a', order: 0 },
      { id: 'c', order: 1 },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['a', 'c', 'b', 'no-order']);
  });

  it('order 相同保持原相对顺序', () => {
    const sorted = sortSectionsByOrder([
      { id: 'first', order: 1 },
      { id: 'second', order: 1 },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['first', 'second']);
  });
});
