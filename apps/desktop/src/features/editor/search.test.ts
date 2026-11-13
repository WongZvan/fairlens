import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import { flExtensions, resumeDocToPm } from './nodes.js';
import { matchLabel, nextIndex, prevIndex, findMatches } from './search.js';
import type { ResumeDoc } from '@fairlens/shared';

/** 用真实 schema 构造 PM doc：只测搜索定位，不涉及编辑器视图 */
const schema = getSchema([Document, Text, Paragraph, Bold, Italic, ...flExtensions]);

function buildPm() {
  const doc: ResumeDoc = {
    templateId: 'tpl-classic',
    sections: [
      {
        id: 'SecExp000001',
        type: 'experience',
        title: '实习经历',
        entries: [
          {
            id: 'Ent000000001',
            org: '字节跳动',
            bullets: [
              { id: 'Bul000000001', runs: [{ text: '主导缓存重构，覆盖 12 个服务' }] },
              { id: 'Bul000000002', runs: [{ text: '产品需求评审与排期' }, { text: '，产品文档撰写', bold: true }] },
            ],
          },
        ],
      },
    ],
  };
  return schema.nodeFromJSON(resumeDocToPm(doc));
}

describe('内联搜索：匹配定位（#126）', () => {
  it('跨 run 连续匹配（同一 bullet 内加粗边界不打折）', () => {
    const pm = buildPm();
    // 「产品」在第二个 bullet 里出现两次：一次在普通 run，一次在同 run 内
    const matches = findMatches(pm, '产品');
    expect(matches.length).toBe(2);
    expect(matches[0]!.to).toBeGreaterThan(matches[0]!.from);
  });

  it('匹配区间取出的文本与查询一致', () => {
    const pm = buildPm();
    const [first] = findMatches(pm, '缓存');
    expect(first).toBeDefined();
    expect(pm.textBetween(first!.from, first!.to)).toBe('缓存');
  });

  it('大小写不敏感（英文）', () => {
    const doc: ResumeDoc = {
      templateId: 'tpl-classic',
      sections: [
        {
          id: 'Sec000000001',
          type: 'experience',
          title: 'x',
          entries: [{ id: 'Ent000000001', org: 'A', bullets: [{ id: 'Bul000000001', runs: [{ text: 'Spearheaded Redis' }] }] }],
        },
      ],
    };
    const pm = schema.nodeFromJSON(resumeDocToPm(doc));
    expect(findMatches(pm, 'redis').length).toBe(1);
    expect(pm.textBetween(...(Object.values(findMatches(pm, 'REDIS')[0]!) as [number, number]))).toBe('Redis');
  });

  it('不跨文本块匹配（不同 bullet 之间不连续）', () => {
    const doc: ResumeDoc = {
      templateId: 'tpl-classic',
      sections: [
        {
          id: 'Sec000000001',
          type: 'experience',
          title: 'x',
          entries: [
            {
              id: 'Ent000000001',
              org: 'A',
              bullets: [
                { id: 'Bul000000001', runs: [{ text: '产品' }] },
                { id: 'Bul000000002', runs: [{ text: '经理' }] },
              ],
            },
          ],
        },
      ],
    };
    const pm = schema.nodeFromJSON(resumeDocToPm(doc));
    expect(findMatches(pm, '产品经理').length).toBe(0);
    expect(findMatches(pm, '产品').length).toBe(1);
    expect(findMatches(pm, '经理').length).toBe(1);
  });

  it('空查询/纯空白 → 无匹配', () => {
    const pm = buildPm();
    expect(findMatches(pm, '')).toEqual([]);
    expect(findMatches(pm, '   ')).toEqual([]);
  });

  it('同一文本块内多次出现全部命中', () => {
    const doc: ResumeDoc = {
      templateId: 'tpl-classic',
      sections: [
        {
          id: 'Sec000000001',
          type: 'experience',
          title: 'x',
          entries: [{ id: 'Ent000000001', org: 'A', bullets: [{ id: 'Bul000000001', runs: [{ text: '优化优化再优化' }] }] }],
        },
      ],
    };
    const pm = schema.nodeFromJSON(resumeDocToPm(doc));
    expect(findMatches(pm, '优化').length).toBe(3);
  });

  it('未命中返回空数组', () => {
    expect(findMatches(buildPm(), '不存在的词')).toEqual([]);
  });
});

describe('内联搜索：循环与计数', () => {
  it('下一条/上一条循环', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(2, 3)).toBe(1);
  });

  it('空列表返回 -1（调用方据此不移动选区）', () => {
    expect(nextIndex(0, 0)).toBe(-1);
    expect(prevIndex(0, 0)).toBe(-1);
  });

  it('计数显示为 1-based；无匹配 0/0', () => {
    expect(matchLabel(0, 17)).toBe('1/17');
    expect(matchLabel(16, 17)).toBe('17/17');
    expect(matchLabel(-1, 0)).toBe('0/0');
  });
});