import { describe, expect, it } from 'vitest';
import { nanoid } from '../../lib/nanoid.js';
import { ResumeDoc } from '@fairlens/shared';
import { pmToResumeDoc, resumeDocToPm } from './nodes.js';

const nid = () => nanoid(12);

function sampleDoc(templateId = 'tpl-duo'): ResumeDoc {
  return ResumeDoc.parse({
    templateId,
    profile: { name: '李思远', headline: '产品经理（26 届）', contactLine: 'a@b.com · github.com/x' },
    sections: [
      {
        id: nid(),
        type: 'basic',
        title: '基本信息',
        basicFields: [{ id: nid(), label: '所在地', value: '武汉 · 可即时到岗' }],
        photo: { id: nid(), mime: 'image/png', blobRef: 'blob:test-photo', w: 100, h: 120 },
        entries: [],
      },
      {
        id: nid(),
        type: 'skill',
        title: '技能',
        entries: [],
        skills: [{ id: nid(), name: '工具', items: ['Figma', 'SQL（基础）'] }],
      },
      {
        id: nid(),
        type: 'experience',
        title: '实习经历',
        entries: [
          {
            id: nid(),
            org: '字节跳动',
            role: '产品实习生',
            start: '2025.06',
            end: '2025.09',
            bullets: [
              {
                id: nid(),
                runs: [
                  { text: '输出 ', bold: true },
                  { text: '12 份报告', href: 'https://example.com/r' },
                  { text: '，效率提升 40%', italic: true },
                ],
              },
            ],
          },
          {
            id: nid(),
            org: '书循环',
            ongoing: true,
            pageBreakBefore: true,
            bullets: [{ id: nid(), runs: [{ text: '0 到 1 上线' }] }],
          },
        ],
      },
    ],
  });
}

interface PMLike {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMLike[];
  text?: string;
}

function findSection(pm: PMLike, type: string): PMLike {
  for (const node of pm.content ?? []) {
    if (node.type === 'flSection' && node.attrs?.type === type) return node;
    if (node.type === 'flColumn') {
      for (const child of node.content ?? []) {
        if (child.type === 'flSection' && child.attrs?.type === type) return child;
      }
    }
  }
  throw new Error(`section not found: ${type}`);
}

function findEntry(pm: PMLike, sectionType: string, index = 0): PMLike {
  const section = findSection(pm, sectionType);
  return (section.content ?? []).filter((n) => n.type === 'flEntry')[index]!;
}

describe('ResumeDoc ↔ ProseMirror 往返（#117 预览纸面结构）', () => {
  it('duo 往返无损：profile/basicFields/photo/skills/entries + 分区顺序全保真', () => {
    const doc = sampleDoc('tpl-duo');
    const back = pmToResumeDoc(resumeDocToPm(doc), { templateId: doc.templateId, style: doc.style });
    expect(back).toEqual(doc);
  });

  it('classic 往返无损：header + 扁平 sections', () => {
    const doc = sampleDoc('tpl-classic');
    const pm = resumeDocToPm(doc);
    expect((pm.content ?? []).map((n) => n.type)).toEqual(['flPageHeader', 'flSection', 'flSection', 'flSection']);
    const back = pmToResumeDoc(pm, { templateId: doc.templateId });
    expect(back).toEqual(doc);
  });

  it('duo 结构：header + side(basic/skill) + main(experience)', () => {
    const pm = resumeDocToPm(sampleDoc('tpl-duo'));
    const types = (pm.content ?? []).map((n) => n.type);
    expect(types).toEqual(['flPageHeader', 'flColumn', 'flColumn']);
    const side = pm.content![1]!;
    const main = pm.content![2]!;
    expect(side.attrs?.kind).toBe('side');
    expect(main.attrs?.kind).toBe('main');
    expect((side.content ?? []).map((s) => s.attrs?.type)).toEqual(['basic', 'skill']);
    expect((main.content ?? []).map((s) => s.attrs?.type)).toEqual(['experience']);
  });

  it('返回值通过契约 zod 校验', () => {
    expect(() => ResumeDoc.parse(pmToResumeDoc(resumeDocToPm(sampleDoc())))).not.toThrow();
  });

  it('section 标题编辑持久化（header 文本优先于 attrs.title）', () => {
    const doc = sampleDoc('tpl-classic');
    const pm = resumeDocToPm(doc);
    const section = findSection(pm as PMLike, 'experience');
    const header = (section.content ?? []).find((n) => n.type === 'flSectionHeader')!;
    header.content = [{ type: 'text', text: '工作经历' }];
    const back = pmToResumeDoc(pm as PMLike, { templateId: doc.templateId });
    expect(back.sections.find((s) => s.type === 'experience')!.title).toBe('工作经历');
  });

  it('entry header attrs 编辑持久化（org/role/start/ongoing）', () => {
    const doc = sampleDoc('tpl-classic');
    const pm = resumeDocToPm(doc);
    const entry = findEntry(pm as PMLike, 'experience');
    const header = (entry.content ?? []).find((n) => n.type === 'flEntryHeader')!;
    header.attrs = {
      ...header.attrs,
      org: '新公司',
      role: '新角色',
      start: '2024.01',
      end: null,
      ongoing: true,
    };
    const back = pmToResumeDoc(pm as PMLike, { templateId: doc.templateId });
    const out = back.sections.find((s) => s.type === 'experience')!.entries[0]!;
    expect(out.org).toBe('新公司');
    expect(out.role).toBe('新角色');
    expect(out.start).toBe('2024.01');
    expect(out.ongoing).toBe(true);
    expect(out.end).toBeUndefined();
  });

  it('空 bullet 不序列化（契约 runs min(1)）', () => {
    const pm = resumeDocToPm(sampleDoc('tpl-classic'));
    const entry = findEntry(pm as PMLike, 'experience');
    const firstBullet = (entry.content ?? []).find((n) => n.type === 'flBullet');
    if (firstBullet) firstBullet.content = [];
    const back = pmToResumeDoc(pm as PMLike, { templateId: 'tpl-classic' });
    const expEntry = back.sections.find((s) => s.type === 'experience')!.entries[0]!;
    expect(expEntry.bullets).toHaveLength(0);
    expect(expEntry.org).toBe('字节跳动');
    expect(() => ResumeDoc.parse(back)).not.toThrow();
  });

  it('三种 mark 保真：bold/italic/link(href) 位置与值不漂移', () => {
    const back = pmToResumeDoc(resumeDocToPm(sampleDoc('tpl-classic')));
    const runs = back.sections.find((s) => s.type === 'experience')!.entries[0]!.bullets[0]!.runs;
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual({ text: '输出 ', bold: true });
    expect(runs[1]).toEqual({ text: '12 份报告', href: 'https://example.com/r' });
    expect(runs[2]).toEqual({ text: '，效率提升 40%', italic: true });
  });

  it('duo 无照片时插入占位槽，但不写入 ResumeDoc', () => {
    const base = sampleDoc('tpl-duo');
    const noPhoto = ResumeDoc.parse({
      ...base,
      sections: base.sections.map((s) => (s.type === 'basic' ? { ...s, photo: undefined } : s)),
    });
    const pm = resumeDocToPm(noPhoto);
    const basic = findSection(pm as PMLike, 'basic');
    expect((basic.content ?? []).some((n) => n.type === 'flPhotoSlot' && n.attrs?.placeholder === true)).toBe(true);
    expect(pmToResumeDoc(pm as PMLike, { templateId: 'tpl-duo' })).toEqual(noPhoto);
  });

  it('未知节点类型被忽略（schema 封闭：外来内容不进 ResumeDoc）', () => {
    const pm = resumeDocToPm(sampleDoc('tpl-classic'));
    (pm.content ?? []).unshift({ type: 'image', attrs: { src: 'x' } });
    const back = pmToResumeDoc(pm, { templateId: 'tpl-classic' });
    expect(back.sections).toHaveLength(3);
    expect(back.sections.every((s) => ['basic', 'education', 'experience', 'project', 'skill'].includes(s.type))).toBe(true);
  });
});
