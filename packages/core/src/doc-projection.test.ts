import { describe, expect, it } from 'vitest';
import type { ResumeDoc, Run } from '@fairlens/shared';
import {
  collectProjectedIds,
  estimateProjection,
  estimateTokens,
  markdownToRuns,
  projectDoc,
  projectScope,
  renderProjection,
  runsToMarkdown,
} from './doc-projection.js';

/** 最小样例：basic（字段）+ experience（两条要点，含标记/链接）+ skill（技能组） */
function doc(): ResumeDoc {
  return {
    templateId: 'tpl-classic',
    profile: { name: '李思远', headline: '产品经理', contactLine: 'a@b.com' },
    sections: [
      {
        id: 'SecBas1c0001',
        type: 'basic',
        title: '基本信息',
        basicFields: [
          { id: 'FldLoc000001', label: '所在地', value: '武汉' },
          { id: 'FldGit000001', label: 'GitHub', value: 'lisiyuan', href: 'https://github.com/lisiyuan' },
        ],
        entries: [],
      },
      {
        id: 'SecExp000001',
        type: 'experience',
        title: '实习经历',
        entries: [
          {
            id: 'EntByt000001',
            org: '字节跳动',
            role: '后端实习生',
            start: '2025.06',
            end: '2025.09',
            bullets: [
              {
                id: 'Bul001000001',
                runs: [
                  { text: '将接口 P99 从 340ms 降至 90ms', bold: true },
                  { text: '（命中率 +18%）' },
                ],
              },
              {
                id: 'Bul002000001',
                runs: [{ text: '主导' }, { text: '缓存重构', href: 'https://github.com/x/y' }, { text: '，覆盖 12 个服务' }],
              },
            ],
          },
          { id: 'EntEmpty0001', org: '空壳公司', bullets: [] },
        ],
      },
      {
        id: 'SecSki000001',
        type: 'skill',
        title: '技能',
        entries: [],
        skills: [{ id: 'SkGMain00001', name: '技能', items: ['Axure', 'SQL'] }],
      },
    ],
  };
}

describe('token 估算（§6.3 口径 + 安全系数）', () => {
  it('空串为 0', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('纯中文按 1.5 字/token 再乘 1.2', () => {
    // 15 个汉字 ÷1.5 = 10 → ×1.2 = 12
    expect(estimateTokens('一二三四五六七八九十一二三四五')).toBe(12);
  });

  it('纯 ASCII 按 4 字符/token 再乘 1.2', () => {
    // 40 字符 ÷4 = 10 → ×1.2 = 12
    expect(estimateTokens('a'.repeat(40))).toBe(12);
  });

  it('中英混排sum两部分', () => {
    // 6 汉字=4 → 4；8 ASCII=2 → 合计 6 → ×1.2=7.2 → ceil 8
    expect(estimateTokens('中文中文中文abcdefgh')).toBe(8);
  });

  it('向上取整（不低估）', () => {
    // 1 汉字 = 0.667 → ×1.2 = 0.8 → ceil 1
    expect(estimateTokens('中')).toBe(1);
  });
});

describe('Run[] ⇄ Markdown 往返（无损）', () => {
  const cases: Array<{ name: string; runs: Run[] }> = [
    { name: '纯文本', runs: [{ text: '普通文本' }] },
    { name: '加粗', runs: [{ text: '重点', bold: true }, { text: '，其余' }] },
    { name: '斜体', runs: [{ text: '强调', italic: true }] },
    { name: '链接', runs: [{ text: '仓库', href: 'https://github.com/a/b' }] },
    { name: '加粗+斜体+链接三层嵌套', runs: [{ text: '点我', bold: true, italic: true, href: 'https://x.y/z' }] },
    { name: '中文标点与数字', runs: [{ text: 'P99 从 340ms 降至 90ms（+18%）', bold: true }] },
    { name: '含 Markdown 特殊字符需转义', runs: [{ text: 'a*b[c]d', bold: true }, { text: ' (e)' }] },
    { name: '反斜杠', runs: [{ text: 'C:\\path\\to' }] },
    { name: '多段拼接', runs: [{ text: '第一' }, { text: '粗', bold: true }, { text: '第三' }] },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const md = runsToMarkdown(c.runs);
      const back = markdownToRuns(md);
      expect(back).not.toBeNull();
      expect(back).toEqual(c.runs);
    });
  }

  it('多标记的嵌套顺序稳定（link 最内 → italic → bold）', () => {
    expect(runsToMarkdown([{ text: 'x', bold: true, italic: true, href: 'https://a.b' }])).toBe(
      '[***x***](https://a.b)',
    );
  });

  it('相邻同样式片段合并', () => {
    const back = markdownToRuns('**a****b**');
    expect(back).toEqual([{ text: 'ab', bold: true }]);
  });
});

describe('markdownToRuns 的防御行为', () => {
  it('空串返回 null（调用方必须拒绝）', () => {
    expect(markdownToRuns('')).toBeNull();
    expect(markdownToRuns('   ')).not.toBeNull(); // 空白是合法内容
  });

  it('不成对的标记按字面文本处理', () => {
    expect(markdownToRuns('**未闭合')).toEqual([{ text: '**未闭合' }]);
  });

  it('兼容 __粗__ 与 _斜_', () => {
    expect(markdownToRuns('__粗__')).toEqual([{ text: '粗', bold: true }]);
    expect(markdownToRuns('_斜_')).toEqual([{ text: '斜', italic: true }]);
  });

  it('链接目标内的成对括号正确配对', () => {
    const runs = markdownToRuns('[文档](https://en.wikipedia.org/wiki/A_(b))');
    expect(runs).toEqual([{ text: '文档', href: 'https://en.wikipedia.org/wiki/A_(b)' }]);
  });

  it('空链接目标视为不可解析（保留字面）', () => {
    expect(markdownToRuns('[x]()')).toEqual([{ text: '[x]()' }]);
  });
});

describe('投影树', () => {
  it('结构完整：profile + 三个分区', () => {
    const tree = projectDoc(doc());
    expect(tree.templateId).toBe('tpl-classic');
    expect(tree.profile?.name).toBe('李思远');
    expect(tree.sections.map((s) => s.type)).toEqual(['basic', 'experience', 'skill']);
  });

  it('空壳条目（bullets 为空）被过滤', () => {
    const tree = projectDoc(doc());
    const exp = tree.sections[1]!;
    expect(exp.entries.map((e) => e.org)).toEqual(['字节跳动']);
  });

  it('条目头结构化：org/role/日期', () => {
    const entry = projectDoc(doc()).sections[1]!.entries[0]!;
    expect(entry.org).toBe('字节跳动');
    expect(entry.role).toBe('后端实习生');
    expect(entry.date).toBe('2025.06 – 2025.09');
  });

  it('进行中（ongoing）日期显示「至今」', () => {
    const d = doc();
    d.sections[1]!.entries[0]!.ongoing = true;
    d.sections[1]!.entries[0]!.end = undefined;
    expect(projectDoc(d).sections[1]!.entries[0]!.date).toBe('2025.06 – 至今');
  });

  it('要点行保留 Markdown 标记（不截断）', () => {
    const lines = projectDoc(doc()).sections[1]!.entries[0]!.lines;
    expect(lines[0]!.markdown).toBe('**将接口 P99 从 340ms 降至 90ms**（命中率 +18%）');
    expect(lines[1]!.markdown).toBe('主导[缓存重构](https://github.com/x/y)，覆盖 12 个服务');
  });

  it('长要点不被截断（与 snapshot-diff 的 40 字 label 不同）', () => {
    const long = '这是一条很长很长的要点'.repeat(10);
    const d = doc();
    d.sections[1]!.entries[0]!.bullets = [{ id: 'Bul031000001', runs: [{ text: long }] }];
    expect(projectDoc(d).sections[1]!.entries[0]!.lines[0]!.markdown).toBe(long);
  });

  it('字段与技能组带 blockId', () => {
    const tree = projectDoc(doc());
    expect(tree.sections[0]!.fields.map((f) => f.blockId)).toEqual(['FldLoc000001', 'FldGit000001']);
    expect(tree.sections[2]!.skills[0]!.blockId).toBe('SkGMain00001');
  });

  it('照片只报告存在性', () => {
    const d = doc();
    d.sections[0]!.photo = { id: 'Pht000000001', mime: 'image/png', blobRef: 'blob-1', w: 100, h: 120 };
    expect(projectDoc(d).sections[0]!.hasPhoto).toBe(true);
    expect(JSON.stringify(projectDoc(d))).not.toContain('blob-1');
  });

  it('投影中所有 id 都能在原文里找到（不造假锚点）', () => {
    const d = doc();
    const ids = new Set(collectProjectedIds(projectDoc(d)));
    const actual = new Set<string>();
    for (const s of d.sections) {
      actual.add(s.id);
      for (const f of s.basicFields ?? []) actual.add(f.id);
      for (const g of s.skills ?? []) actual.add(g.id);
      for (const e of s.entries) {
        actual.add(e.id);
        for (const b of e.bullets) actual.add(b.id);
      }
    }
    for (const id of ids) expect(actual.has(id)).toBe(true);
  });
});

describe('渲染文本', () => {
  it('每行都带 blockId 锚点', () => {
    const text = renderProjection(projectDoc(doc()));
    expect(text).toContain('## 实习经历  [SecExp000001]');
    expect(text).toContain('- 字节跳动 · 后端实习生 · 2025.06 – 2025.09  [EntByt000001]');
    expect(text).toContain('  - **将接口 P99 从 340ms 降至 90ms**（命中率 +18%）  [Bul001000001]');
  });

  it('页头单独成块', () => {
    const text = renderProjection(projectDoc(doc()));
    expect(text.startsWith('# 页头')).toBe(true);
    expect(text).toContain('姓名：李思远 · 求职意向：产品经理 · 联系方式：a@b.com');
  });

  it('headline 自带「求职意向：」前缀时不重复', () => {
    const d = doc();
    d.profile!.headline = '求职意向：产品经理（26 届）';
    const text = renderProjection(projectDoc(d));
    expect(text).toContain('求职意向：产品经理（26 届）');
    expect(text).not.toContain('求职意向：求职意向：');
  });

  it('渲染文本可被 token 估算消费', () => {
    const tree = projectDoc(doc());
    expect(estimateProjection(tree)).toBe(estimateTokens(renderProjection(tree)));
    expect(estimateProjection(tree)).toBeGreaterThan(0);
  });
});

describe('作用域切片（按模块读的唯一入口）', () => {
  const d = doc();

  it('doc 作用域=整篇', () => {
    expect(projectScope(d, { kind: 'doc' }).sections).toHaveLength(3);
  });

  it('section 作用域只留该分区', () => {
    const tree = projectScope(d, { kind: 'section', sectionId: 'SecExp000001' });
    expect(tree.sections.map((s) => s.blockId)).toEqual(['SecExp000001']);
    // 页头仍在（提供姓名/意向上下文）
    expect(tree.profile?.name).toBe('李思远');
  });

  it('entry 作用域只留该条目，且抹掉同分区其他块', () => {
    const tree = projectScope(d, { kind: 'entry', entryId: 'EntByt000001' });
    expect(tree.sections).toHaveLength(1);
    const sec = tree.sections[0]!;
    expect(sec.entries.map((e) => e.blockId)).toEqual(['EntByt000001']);
    expect(sec.fields).toEqual([]);
    expect(sec.skills).toEqual([]);
    expect(sec.hasPhoto).toBe(false);
  });

  it('找不到 id 时返回空 sections（不静默降级为整篇）', () => {
    expect(projectScope(d, { kind: 'section', sectionId: 'Nope00000001' }).sections).toEqual([]);
    expect(projectScope(d, { kind: 'entry', entryId: 'Nope00000001' }).sections).toEqual([]);
  });

  it('切片后 token 显著小于全篇', () => {
    const full = estimateProjection(projectScope(d, { kind: 'doc' }));
    const one = estimateProjection(projectScope(d, { kind: 'entry', entryId: 'EntByt000001' }));
    expect(one).toBeLessThan(full);
  });
});