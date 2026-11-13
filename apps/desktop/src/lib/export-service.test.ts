import { describe, expect, it } from 'vitest';
import { buildArchiveRecord, exportFileName } from './export-service.js';

describe('导出文件名（§9：姓名_简历_YYYY-MM-DD.ext）', () => {
  const at = new Date(2026, 10, 13); // 2026-11-13（月份 0-based）

  it('PDF 与归档各自扩展名', () => {
    expect(exportFileName('李思远', 'pdf', at)).toBe('李思远_简历_2026-11-13.pdf');
    expect(exportFileName('李思远', 'fairlens', at)).toBe('李思远_简历_2026-11-13.fairlens');
  });

  it('月份/日期补零', () => {
    expect(exportFileName('A', 'pdf', new Date(2026, 0, 5))).toBe('A_简历_2026-01-05.pdf');
  });

  it('姓名缺失回落「我的简历」（不编造姓名）', () => {
    expect(exportFileName(undefined, 'pdf', at)).toBe('我的简历_简历_2026-11-13.pdf');
    expect(exportFileName('   ', 'pdf', at)).toBe('我的简历_简历_2026-11-13.pdf');
  });

  it('文件名非法字符替换为下划线（Windows 保留字符）', () => {
    // 输入 9 个字符（李 / 思 \ 远 : * ? " < > |）→ 8 个保留字符各替换 1 个下划线
    expect(exportFileName('李/思\\远:*?"<>|', 'pdf', at)).toBe('李_思_远________简历_2026-11-13.pdf');
  });
});

describe('归档 payload（#125）', () => {
  const at = new Date(2026, 10, 13, 10, 0, 0);

  it('kind=resume + format/version/exportedAt 符合契约', () => {
    const payload = buildArchiveRecord({
      resume: {
        id: 'Ab3kZ9pQ2xY1',
        title: '示例简历',
        verticalId: 'general',
        status: 'active',
        doc: { templateId: 'tpl-classic', sections: [{ id: 'Cd4lA0qR3zX2', type: 'basic', title: '基本信息', entries: [] }] },
      },
      snapshots: [],
      now: at,
    });
    expect(payload.format).toBe('fairlens-archive');
    expect(payload.version).toBe(1);
    expect(payload.kind).toBe('resume');
    expect(payload.exportedAt).toBe(at.toISOString());
    expect(payload.resumes).toHaveLength(1);
  });

  it('快照随简历一并打包', () => {
    const payload = buildArchiveRecord({
      resume: {
        id: 'Ab3kZ9pQ2xY1',
        title: 'x',
        verticalId: 'general',
        status: 'active',
        doc: { templateId: 'tpl-classic', sections: [] } as never,
      },
      snapshots: [
        {
          id: 'Ef5mB1sT4aY3',
          resumeId: 'Ab3kZ9pQ2xY1',
          doc: { templateId: 'tpl-classic', sections: [] } as never,
          trigger: 'manual',
          createdAt: at.toISOString(),
        },
      ],
      now: at,
    });
    expect(payload.resumes[0]!.snapshots).toHaveLength(1);
  });

  it('reviewSessions/patchLog 为空数组（两表至今无写入方，如实反映）', () => {
    const payload = buildArchiveRecord({
      resume: {
        id: 'Ab3kZ9pQ2xY1',
        title: 'x',
        verticalId: 'general',
        status: 'active',
        doc: { templateId: 'tpl-classic', sections: [] } as never,
      },
      snapshots: [],
      now: at,
    });
    expect(payload.resumes[0]!.reviewSessions).toEqual([]);
    expect(payload.resumes[0]!.patchLog).toEqual([]);
  });
});