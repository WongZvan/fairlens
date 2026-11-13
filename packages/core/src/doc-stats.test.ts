import { describe, expect, it } from 'vitest';
import type { ResumeDoc } from '@fairlens/shared';
import { docStats, formatCount } from './doc-stats.js';

const doc = (): ResumeDoc => ({
  templateId: 'tpl-classic',
  profile: { name: '李思远' },
  sections: [
    {
      id: 'SecBas000001',
      type: 'basic',
      title: '基本信息',
      basicFields: [{ id: 'Flp000000001', label: '所在地', value: '武汉' }],
      entries: [],
    },
    {
      id: 'SecExp000001',
      type: 'experience',
      title: '实习经历',
      entries: [
        {
          id: 'Ent000000001',
          org: '字节跳动',
          bullets: [
            { id: 'Bul000000001', runs: [{ text: '将 P99 从 340ms 降至 90ms' }] },
            { id: 'Bul000000002', runs: [{ text: '主导' }, { text: '缓存重构', bold: true }] },
          ],
        },
        { id: 'Ent000000002', org: '空壳公司', bullets: [] },
      ],
    },
  ],
});

describe('文档统计（状态栏字数/要点）', () => {
  it('字数不计空白与换行', () => {
    const d: ResumeDoc = {
      templateId: 't',
      sections: [
        {
          id: 'Sec000000001',
          type: 'experience',
          title: 'x',
          entries: [{ id: 'Ent000000001', org: 'A', bullets: [{ id: 'Bul000000001', runs: [{ text: ' a b\n c ' }] }] }],
        },
      ],
    };
    expect(docStats(d).chars).toBe(3);
  });

  it('要点数只算有文本的 bullet；条目数含空壳', () => {
    const s = docStats(doc());
    expect(s.bullets).toBe(2);
    expect(s.entries).toBe(2);
  });

  it('字数含加粗等多 run 拼接', () => {
    // '将P99从340ms降至90ms' = 15? 直接数实现输出，确保多 run 不丢字
    const s = docStats(doc());
    expect(s.chars).toBeGreaterThan(15);
  });

  it('不含页头与基本信息字段（避免误导"我写了多少"）', () => {
    const withProfile: ResumeDoc = { ...doc(), profile: { name: '很长很长的姓名示例' } };
    expect(docStats(withProfile).chars).toBe(docStats(doc()).chars);
    const withFields: ResumeDoc = { ...doc() };
    withFields.sections[0]!.basicFields![0]!.value = '某某某市某某区某某路';
    expect(docStats(withFields).chars).toBe(docStats(doc()).chars);
  });

  it('空文档/空值 → 全 0', () => {
    expect(docStats(null)).toEqual({ chars: 0, bullets: 0, entries: 0 });
    expect(docStats(undefined)).toEqual({ chars: 0, bullets: 0, entries: 0 });
  });

  it('空白 bullet（旧数据）不计入', () => {
    const d: ResumeDoc = {
      templateId: 't',
      sections: [
        {
          id: 'Sec000000001',
          type: 'experience',
          title: 'x',
          entries: [{ id: 'Ent000000001', org: 'A', bullets: [{ id: 'Bul000000001', runs: [{ text: '   ' }] }] }],
        },
      ],
    };
    expect(docStats(d)).toMatchObject({ bullets: 0, chars: 0 });
  });

  it('千分位格式化', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1240)).toBe('1,240');
    expect(formatCount(1234567)).toBe('1,234,567');
  });
});