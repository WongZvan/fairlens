import { describe, expect, it } from 'vitest';
import { toggleCollapsed } from './outline-collapse.js';

describe('大纲分区折叠（#117 反馈）', () => {
  it('不存在则加入；已存在则移除', () => {
    const start: string[] = [];
    const collapsed = toggleCollapsed(start, 'SecEdu000001');
    expect(collapsed).toEqual(['SecEdu000001']);
    expect(toggleCollapsed(collapsed, 'SecEdu000001')).toEqual([]);
  });

  it('不可变：不修改入参', () => {
    const start = ['a'];
    const next = toggleCollapsed(start, 'b');
    expect(start).toEqual(['a']);
    expect(next).toEqual(['a', 'b']);
  });

  it('保留其他分区 id', () => {
    expect(toggleCollapsed(['a', 'b'], 'a')).toEqual(['b']);
  });
});
