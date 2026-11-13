import { describe, expect, it } from 'vitest';
import { canonicalJson, sameDoc } from './doc-equality.js';

describe('doc 等价判定（dirty 基线比较）', () => {
  it('同一引用等价', () => {
    const a = { x: 1 };
    expect(sameDoc(a, a)).toBe(true);
  });

  it('键序不同仍等价（核心：zod 解析 vs PM 序列化 vs 库反序列化键序可能不同）', () => {
    expect(sameDoc({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(
      sameDoc(
        { templateId: 't', sections: [{ id: 'A', type: 'basic', title: 'x', entries: [] }] },
        { sections: [{ entries: [], title: 'x', type: 'basic', id: 'A' }], templateId: 't' },
      ),
    ).toBe(true);
  });

  it('数组顺序不同不等价（要点顺序是语义）', () => {
    expect(sameDoc({ list: [1, 2] }, { list: [2, 1] })).toBe(false);
  });

  it('增删字段不等价', () => {
    expect(sameDoc({ a: 1 }, { a: 1, b: undefined })).toBe(true); // undefined 与缺省同义
    expect(sameDoc({ a: 1 }, { a: 1, b: null })).toBe(false);
    expect(sameDoc({ a: 1 }, {})).toBe(false);
  });

  it('嵌套结构与 null/数组混合', () => {
    const a = { p: { name: '李', fields: null }, s: [{ runs: [{ text: 'x' }] }] };
    const b = { s: [{ runs: [{ text: 'x' }] }], p: { fields: null, name: '李' } };
    expect(sameDoc(a, b)).toBe(true);
  });

  it('canonicalJson 键序稳定（可用于日志/审计）', () => {
    expect(canonicalJson({ b: 1, a: [ { d: 2, c: 3 } ] })).toBe('{"a":[{"c":3,"d":2}],"b":1}');
  });
});