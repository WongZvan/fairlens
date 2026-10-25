import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  Entry,
  ErrorCode,
  EvaluationReport,
  FairlensFile,
  JobDescription,
  LeaseRequest,
  LicenseClaims,
  LlmProviderConfig,
  PromptPack,
  ResumeDoc,
  ResumeRecord,
  ResourceRegistry,
  SettingValueSchemas,
  SnapshotRow,
  SnapshotTrigger,
  ResumeRow,
  SupplementPack,
  TemplateManifest,
  validateDocStyleAgainstManifest,
} from './index.js';

const id = 'Ab3kZ9pQ2xY1';
const doc = (over: Partial<z.infer<typeof ResumeDoc>> = {}): z.infer<typeof ResumeDoc> => ({
  templateId: 'tpl-classic',
  sections: [
    {
      id,
      type: 'basic',
      title: '基本信息',
      basicFields: [{ id, label: '邮箱', value: 'a@b.c', href: 'mailto:a@b.c' }],
      entries: [],
    },
    {
      id: 'Cd4lA0qR3zX2',
      type: 'experience',
      title: '实习经历',
      entries: [
        {
          id: 'Ef5mB1sT4aY3',
          org: '字节跳动',
          role: '产品实习生',
          start: '2025.06',
          end: '2025.09',
          bullets: [
            { id: 'Gh6nC2uU5bZ4', runs: [{ text: '输出 ', bold: true }, { text: '12 份报告', href: 'https://example.com' }] },
          ],
        },
      ],
    },
  ],
  ...over,
});

describe('ResumeDoc 契约', () => {
  it('合法文档往返序列化无损', () => {
    const parsed = ResumeDoc.parse(doc());
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('非法：blockId 非 nanoid12 被拒', () => {
    const bad = doc();
    bad.sections[0]!.id = 'short';
    expect(ResumeDoc.safeParse(bad).success).toBe(false);
  });

  it('非法：链接 scheme 白名单拦截 javascript:', () => {
    const bad = doc();
    bad.sections[0]!.basicFields = [{ id, label: '博客', value: 'x', href: 'javascript:alert(1)' }];
    expect(ResumeDoc.safeParse(bad).success).toBe(false);
  });

  it('非法：Run 的 bold 只接受字面 true（封闭标记）', () => {
    const bad = doc();
    bad.sections[1]!.entries[0]!.bullets[0]!.runs[0]!.bold = 'yes' as unknown as true;
    expect(ResumeDoc.safeParse(bad).success).toBe(false);
  });

  it('refine：end 早于 start 被拒；ongoing 带 end 被拒', () => {
    expect(
      Entry.safeParse({ id, org: 'A', start: '2025.09', end: '2025.06', bullets: [] }).success,
    ).toBe(false);
    expect(
      Entry.safeParse({ id, org: 'A', start: '2025.06', ongoing: true, end: '2025.09', bullets: [] }).success,
    ).toBe(false);
    expect(Entry.safeParse({ id, org: 'A', start: '2025.06', ongoing: true, bullets: [] }).success).toBe(true);
  });

  it('非法：日期格式非 YYYY.MM 被拒', () => {
    expect(Entry.safeParse({ id, org: 'A', start: '2025-06', bullets: [] }).success).toBe(false);
  });

  it('ResumeRecord 默认 verticalId=general / status=active', () => {
    const r = ResumeRecord.parse({ id, title: '李思远·产品', doc: doc() });
    expect(r.verticalId).toBe('general');
    expect(r.status).toBe('active');
  });
});

describe('受控样式三维 × 模板声明集', () => {
  const manifest = TemplateManifest.parse({
    id: 'tpl-classic',
    name: '经典单栏',
    thumbnail: 'classic.png',
    version: 1,
    sections: [{ type: 'basic', order: 0, maxEntries: 1 }, { type: 'experience', order: 1, maxEntries: 8 }],
    optionalFields: ['links'],
    styleOptions: {
      fontThemes: [{ id: 'serif', name: '宋体系', fonts: { heading: 'Noto Serif SC', body: 'Noto Serif SC' } }],
      densities: ['compact', 'normal'],
      accents: ['#33518E'],
    },
    styleTokens: { fontHeading: 'Noto Serif SC', fontBody: 'Noto Serif SC', accent: '#33518E', spacing: 'normal', radius: '2px' },
    export: { printCssPath: 'classic.css', docxGenerator: 'classic.docx.ts' },
  });

  it('样式值 ∈ 声明集 通过', () => {
    expect(validateDocStyleAgainstManifest(manifest, { fontTheme: 'serif', density: 'normal', accent: '#33518E' })).toEqual({ ok: true });
    expect(validateDocStyleAgainstManifest(manifest, { density: 'auto' })).toEqual({ ok: true }); // auto 恒可
  });

  it('越界拒绝并指明维度（切模板回落依据）', () => {
    expect(validateDocStyleAgainstManifest(manifest, { fontTheme: 'nope' })).toEqual({ ok: false, reason: 'fontTheme' });
    expect(validateDocStyleAgainstManifest(manifest, { density: 'loose' })).toEqual({ ok: false, reason: 'density' });
    expect(validateDocStyleAgainstManifest(manifest, { accent: '#C4372B' })).toEqual({ ok: false, reason: 'accent' });
  });

  it('强色板格式 #RRGGBB 校验', () => {
    expect(
      TemplateManifest.safeParse({ ...manifest, styleOptions: { ...manifest.styleOptions, accents: ['red'] } }).success,
    ).toBe(false);
  });
});

describe('评估/提示词/授权契约', () => {
  it('EvaluationReport：Finding.blockId 可空 + authorId 预留', () => {
    const r = EvaluationReport.parse({
      verticalId: 'general', model: 'glm-4.7', promptVersion: 4, evaluatedAt: '2026-10-24T14:02:00+08:00',
      overall: 62,
      dimensions: [{ dimensionId: 'quantify', score: 48, level: '中', findings: [{ blockId: null, severity: 'high', message: '缺量化', suggestion: '补数字' }] }],
      summary: '先补数字。',
      matchGeneric: true,
    });
    expect(r.dimensions[0]!.findings[0]!.authorId).toBeUndefined();
  });

  it('SupplementPack：文本 ≤2000 字且场景含 interview 预留', () => {
    const ok = SupplementPack.parse({ verticalId: 'general', version: 1, author: 'expert', entries: [{ scenario: 'evaluate', text: '附加要求' }] });
    expect(ok.entries).toHaveLength(1);
    const bad = SupplementPack.safeParse({ verticalId: 'general', version: 1, author: 'e', entries: [{ scenario: 'evaluate', text: 'x'.repeat(2001) }] });
    expect(bad.success).toBe(false);
    expect(SupplementPack.safeParse({ verticalId: 'general', version: 1, author: 'e', entries: [{ scenario: 'interview', text: 'y' }] }).success).toBe(true);
  });

  it('PromptPack 必含四模板 + rubric 非空', () => {
    const t = { template: '...{{resume_block}}...', version: 1 };
    expect(PromptPack.safeParse({ verticalId: 'general', displayName: '通用', version: 1, status: 'draft', prompts: { revise: t, evaluate: t, walkthrough: t, structure: { template: 'x', version: 1 } }, rubric: [] }).success).toBe(false);
  });

  it('LicenseClaims：exp 可空（dev 无限期）+ role 含 expert 枚举', () => {
    const claims = LicenseClaims.parse({ v: 1, code: 'FL-1', role: 'expert', batchId: 'b', exp: null, iat: '2026-10-24T00:00:00+08:00' });
    expect(claims.exp).toBeNull();
    expect(LicenseClaims.safeParse({ v: 1, code: 'FL-1', role: 'hacker', batchId: 'b', exp: null, iat: '2026-10-24T00:00:00+08:00' }).success).toBe(false);
  });

  it('LeaseRequest strict：多余字段拒绝（契约封闭）', () => {
    expect(LeaseRequest.safeParse({ action: 'acquire', code: 'FL-1', deviceIdHash: 'a'.repeat(64) }).success).toBe(true);
    expect(LeaseRequest.safeParse({ action: 'acquire', code: 'FL-1', deviceIdHash: 'a'.repeat(64), extra: 1 }).success).toBe(false);
    expect(ErrorCode.options).toContain('slots-full');
  });
});

describe('AI 连接与资源契约', () => {
  it('LlmProviderConfig：contextWindow 声明式 + effort 枚举', () => {
    const cfg = LlmProviderConfig.parse({
      id, label: '我的 DeepSeek', preset: 'deepseek',
      baseURL: 'https://api.deepseek.com/v1', apiKeyRef: 'stronghold:1', model: 'deepseek-chat',
      contextWindow: 131072, effort: 'medium', maxTokens: 4096,
    });
    expect(cfg.preset).toBe('deepseek');
    expect(LlmProviderConfig.safeParse({ ...cfg, baseURL: 'not-a-url' }).success).toBe(false);
  });

  it('FairlensFile 双语义 kind', () => {
    const base = { format: 'fairlens-archive', version: 1, exportedAt: '2026-10-24T00:00:00+08:00', resumes: [] } as const;
    expect(FairlensFile.parse({ ...base, kind: 'resume' }).kind).toBe('resume');
    expect(FairlensFile.parse({ ...base, kind: 'archive' }).kind).toBe('archive');
    expect(FairlensFile.safeParse({ ...base, kind: 'other' }).success).toBe(false);
  });

  it('JobDescription / ResourceRegistry 最小合法样本', () => {
    expect(JobDescription.parse({ id, title: '产品经理', rawText: 'JD 文本' }).company).toBeUndefined();
    expect(ResourceRegistry.parse({ version: 1, verticals: [], templates: [], guides: [] }).version).toBe(1);
  });
});

describe('持久层契约（m1.6，附录 B）', () => {
  it('SnapshotRow 合法解析与 trigger 枚举拒绝', () => {
    const row = SnapshotRow.parse({
      id, resumeId: 'Cd4lA0qR3zX2', doc: doc(), trigger: 'manual', createdAt: '2026-10-25T10:00:00+08:00',
    });
    expect(row.trigger).toBe('manual');
    expect(SnapshotRow.safeParse({ ...row, trigger: 'auto' }).success).toBe(false);
    expect(SnapshotTrigger.safeParse('pre-eval').success).toBe(true);
  });

  it('SnapshotRow：label 可选；doc 必为 ResumeDoc', () => {
    const base = { id, resumeId: 'Cd4lA0qR3zX2', doc: doc(), trigger: 'ai-accept', createdAt: '2026-10-25T10:00:00+08:00' } as const;
    expect(SnapshotRow.parse(base).label).toBeUndefined();
    expect(SnapshotRow.safeParse({ ...base, doc: { ...doc(), templateId: '' } }).success).toBe(false);
  });

  it('ResumeRow = ResumeRecord + createdAt/updatedAt', () => {
    const row = ResumeRow.parse({ id, title: '李思远·产品', doc: doc(), createdAt: '2026-10-25T09:00:00+08:00', updatedAt: '2026-10-25T09:30:00+08:00' });
    expect(row.verticalId).toBe('general');
    expect(ResumeRow.safeParse({ ...row, createdAt: '' }).success).toBe(false);
  });

  it('SettingValueSchemas：autosave 布尔 / bgMode 四态 / bgOpacity 0–100 整数 / bgImage 可空', () => {
    expect(SettingValueSchemas.autosave.safeParse(true).success).toBe(true);
    expect(SettingValueSchemas.autosave.safeParse('yes').success).toBe(false);
    expect(SettingValueSchemas.bgMode.safeParse('theme').success).toBe(true);
    expect(SettingValueSchemas.bgMode.safeParse('auto').success).toBe(false);
    expect(SettingValueSchemas.bgFit.safeParse('cover').success).toBe(true);
    expect(SettingValueSchemas.bgOpacity.safeParse(100).success).toBe(true);
    expect(SettingValueSchemas.bgOpacity.safeParse(101).success).toBe(false);
    expect(SettingValueSchemas.bgOpacity.safeParse(50.5).success).toBe(false);
    expect(SettingValueSchemas.bgImage.safeParse(null).success).toBe(true);
    expect(SettingValueSchemas.bgImage.safeParse('').success).toBe(false);
  });
});
