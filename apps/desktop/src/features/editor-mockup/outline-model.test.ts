import { describe, expect, it } from 'vitest';
import { ResumeDoc } from '@fairlens/shared';
import { buildOutlineTree, outlineFieldLabel, outlineSkillLabel } from './outline-model.js';

const id = (n: number) => `Sec${String(n).padStart(9, '0')}`;

function doc(): ResumeDoc {
  return ResumeDoc.parse({
    templateId: 'tpl-classic',
    sections: [
      {
        id: id(1),
        type: 'basic',
        title: '基本信息',
        entries: [],
        basicFields: [
          { id: 'Fld000000001', label: '所在地', value: '武汉 · 可即时到岗' },
          { id: 'Fld000000002', label: '求职方向', value: '   ' },
        ],
      },
      {
        id: id(2),
        type: 'education',
        title: '  学习经历  ',
        entries: [
          { id: 'Ent000000001', org: '华中科技大学', bullets: [{ id: 'Bul000000001', runs: [{ text: 'GPA 3.6' }] }] },
          { id: 'Ent000000002', org: '空壳条目', bullets: [] },
        ],
      },
      {
        id: id(3),
        type: 'skill',
        title: '   ',
        entries: [],
        skills: [{ id: 'SkG000000001', name: '技能', items: ['Figma', ' SQL ', ''] }],
      },
      {
        id: id(4),
        type: 'project',
        title: '项目经历',
        entries: [],
      },
    ],
  });
}

describe('大纲完整树模型（#118）', () => {
  it('所有分区都保留（含空 basic / 空 project），顺序不变', () => {
    const tree = buildOutlineTree(doc());
    expect(tree.map((s) => s.type)).toEqual(['basic', 'education', 'skill', 'project']);
    expect(tree[0]!.hasChildren).toBe(true); // 有字段
    expect(tree[3]!.hasChildren).toBe(false); // project 空
  });

  it('标题取 section.title 并 trim；空标题回落 null（组件用类型 i18n）', () => {
    const tree = buildOutlineTree(doc());
    expect(tree[0]!.title).toBe('基本信息');
    expect(tree[1]!.title).toBe('学习经历');
    expect(tree[2]!.title).toBeNull();
  });

  it('条目只保留有 bullet 的（空壳条目不进树）', () => {
    const tree = buildOutlineTree(doc());
    expect(tree[1]!.entries.map((e) => e.org)).toEqual(['华中科技大学']);
  });

  it('basicFields / skills 进入叶节点；hasChildren 覆盖三种子节点', () => {
    const tree = buildOutlineTree(doc());
    expect(tree[0]!.fields).toHaveLength(2);
    expect(tree[2]!.skills).toHaveLength(1);
    expect(tree[2]!.hasChildren).toBe(true);
  });

  it('字段标签：value 优先，空值回落 label', () => {
    const tree = buildOutlineTree(doc());
    expect(outlineFieldLabel(tree[0]!.fields[0]!)).toBe('武汉 · 可即时到岗');
    expect(outlineFieldLabel(tree[0]!.fields[1]!)).toBe('求职方向');
  });

  it('技能标签：items 用 · 连接并去空，空项回落 name', () => {
    const tree = buildOutlineTree(doc());
    expect(outlineSkillLabel(tree[2]!.skills[0]!)).toBe('Figma · SQL');
    expect(outlineSkillLabel({ id: 'SkG000000002', name: '工具', items: [] })).toBe('工具');
  });

  it('空文档返回空树', () => {
    expect(buildOutlineTree({ templateId: 'tpl-classic', sections: [] } as unknown as ResumeDoc)).toEqual([]);
  });
});
