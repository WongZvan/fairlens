import { describe, expect, it } from 'vitest';
import { ResumeDoc } from '@fairlens/shared';
import { buildOutlineTree, outlineFieldLabel, outlineSectionLabel, outlineSkillLabel } from './outline-model.js';

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

  // #121：type 自由化后的显示名回落
  const t = (key: string) => `i18n:${key}`;
  const builtinKeys = { basic: 'paper.basic', education: 'paper.edu', experience: 'paper.exp', project: 'paper.proj', skill: 'paper.skills' };

  it('#121 分区显示名：有标题用标题', () => {
    const s = { id: id(1), type: 'custom', title: '自我评价', entries: [] };
    expect(outlineSectionLabel(s, t, builtinKeys)).toBe('自我评价');
  });

  it('#121 分区显示名：内置类型空标题走 i18n', () => {
    const s = { id: id(1), type: 'experience', title: '   ', entries: [] };
    expect(outlineSectionLabel(s, t, builtinKeys)).toBe('i18n:paper.exp');
  });

  it('#121 分区显示名：自定义类型空标题回落 type 原文（不是「基本信息」）', () => {
    const s = { id: id(1), type: 'self-eval', title: '', entries: [] };
    expect(outlineSectionLabel(s, t, builtinKeys)).toBe('self-eval');
  });

  it('#121 自定义 type 分区能进树且不限条数', () => {
    const custom = ResumeDoc.parse({
      templateId: 'tpl-classic',
      sections: [
        {
          id: id(9), type: 'self-eval', title: '自我评价',
          entries: Array.from({ length: 12 }, (_, i) => ({
            id: `Ent${String(i).padStart(9, '0')}`,
            org: `条目${i}`,
            bullets: [{ id: `Bul${String(i).padStart(9, '0')}`, runs: [{ text: 'x' }] }],
          })),
        },
      ],
    });
    const tree = buildOutlineTree(custom);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.entries).toHaveLength(12);
  });
});
