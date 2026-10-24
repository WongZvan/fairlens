import { describe, expect, it } from 'vitest';
import { nanoid } from '../../lib/nanoid.js';
import { ResumeDoc } from '@fairlens/shared';
import { pmToResumeDoc, resumeDocToPm } from './nodes.js';

const nid = () => nanoid(12);

function sampleDoc(): ResumeDoc {
  return ResumeDoc.parse({
    templateId: 'tpl-duo',
    sections: [
      {
        id: nid(),
        type: 'basic',
        title: '基本信息',
        entries: [],
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

describe('m1.3 ResumeDoc ↔ ProseMirror 往返', () => {
  it('往返无损：ResumeDoc → PM → ResumeDoc 深相等（blockId/attrs/marks 全保真）', () => {
    const doc = sampleDoc();
    const back = pmToResumeDoc(resumeDocToPm(doc), { templateId: doc.templateId, style: doc.style });
    expect(back).toEqual(doc);
  });

  it('返回值通过契约 zod 校验（schema 即文档）', () => {
    expect(() => ResumeDoc.parse(pmToResumeDoc(resumeDocToPm(sampleDoc())))).not.toThrow();
  });

  it('三种 mark 保真：bold/italic/link(href) 位置与值不漂移', () => {
    const back = pmToResumeDoc(resumeDocToPm(sampleDoc()));
    const runs = back.sections[1]!.entries[0]!.bullets[0]!.runs;
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual({ text: '输出 ', bold: true });
    expect(runs[1]).toEqual({ text: '12 份报告', href: 'https://example.com/r' });
    expect(runs[2]).toEqual({ text: '，效率提升 40%', italic: true });
  });

  it('语义分页标记与 ongoing 持久化', () => {
    const back = pmToResumeDoc(resumeDocToPm(sampleDoc()));
    expect(back.sections[1]!.entries[1]!.pageBreakBefore).toBe(true);
    expect(back.sections[1]!.entries[1]!.ongoing).toBe(true);
    expect(back.sections[1]!.entries[1]!.end).toBeUndefined();
  });

  it('未知节点类型被忽略（schema 封闭：外来内容不进 ResumeDoc）', () => {
    const pm = resumeDocToPm(sampleDoc());
    pm.content!.unshift({ type: 'image', attrs: { src: 'x' } });
    const back = pmToResumeDoc(pm);
    expect(back.sections.every((s) => ['basic', 'education', 'experience', 'project', 'skill'].includes(s.type))).toBe(true);
    expect(back.sections).toHaveLength(2); // 外来 image 节点被丢弃
  });
});
