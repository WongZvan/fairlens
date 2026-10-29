import { describe, expect, it } from 'vitest';
import type { Entry } from '@fairlens/shared';
import { moveEntry } from './entry-order.js';

const e = (id: string): Entry => ({ id, org: id, bullets: [] }) as Entry;
const ids = (list: Entry[]) => list.map((x) => x.id);

describe('moveEntry（#107 条目换序纯函数）', () => {
  it('把第 0 项移到末尾 / 末项移到开头', () => {
    const list = [e('a'), e('b'), e('c')];
    expect(ids(moveEntry(list, 0, 2))).toEqual(['b', 'c', 'a']);
    expect(ids(moveEntry(list, 2, 0))).toEqual(['c', 'a', 'b']);
  });

  it('中间互换保持其他元素相对顺序', () => {
    const list = [e('a'), e('b'), e('c'), e('d')];
    expect(ids(moveEntry(list, 1, 2))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('同位/越界返回原数组引用（调用方据此跳过）', () => {
    const list = [e('a'), e('b')];
    expect(moveEntry(list, 1, 1)).toBe(list);
    expect(moveEntry(list, -1, 0)).toBe(list);
    expect(moveEntry(list, 0, 5)).toBe(list);
    expect(moveEntry([], 0, 1)).toEqual([]);
  });

  it('不修改入参（不可变更新）', () => {
    const list = [e('a'), e('b'), e('c')];
    moveEntry(list, 0, 2);
    expect(ids(list)).toEqual(['a', 'b', 'c']);
  });
});
