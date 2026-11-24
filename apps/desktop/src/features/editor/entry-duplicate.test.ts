import { describe, expect, it } from 'vitest';
import type { ResumeDoc, TemplateManifest } from '@fairlens/shared';
import { duplicateEntry, entryLimitFor } from './entry-duplicate.js';
import { getBuiltinTemplate } from '../templates/builtin-registry.js';

const sec = (entries: ResumeDoc['sections'][number]['entries']): ResumeDoc => ({
  templateId: 'tpl-classic',
  sections: [{ id: 'sec000000001', type: 'education', title: '教育经历', entries }],
});

const entry = (id: string, bulletId: string) => ({
  id,
  org: '示例公司',
  bullets: [{ id: bulletId, runs: [{ text: '一条要点' }] }],
});

const manifestWith = (maxEntries: number): TemplateManifest =>
  ({ sections: [{ type: 'education', order: 0, maxEntries }] }) as unknown as TemplateManifest;

describe('条目副本 + 篇幅建议（#130 软上限）', () => {
  it('复制到原条目之后，条目/要点 id 全换新，原 doc 不变', () => {
    const doc = sec([entry('e00000000001', 'b00000000001'), entry('e00000000002', 'b00000000002')]);
    const next = duplicateEntry(doc, 'sec000000001', 'e00000000002');
    const entries = next.sections[0]!.entries;
    expect(entries).toHaveLength(3);
    expect(entries[2]!.id).not.toBe('e00000000002');
    expect(entries[2]!.bullets[0]!.id).not.toBe('b00000000002');
    expect(entries[2]!.org).toBe('示例公司');
    // 原 doc 不被就地修改
    expect(doc.sections[0]!.entries).toHaveLength(2);
    expect(doc.sections[0]!.entries[1]!.id).toBe('e00000000002');
  });

  it('达到建议上限：仍可复制（软上限不阻断）', () => {
    const doc = sec([entry('e00000000001', 'b00000000001'), entry('e00000000002', 'b00000000002')]);
    expect(entryLimitFor(doc, manifestWith(2), 'sec000000001')).toMatchObject({ limit: 2, count: 2, reached: true });
    const next = duplicateEntry(doc, 'sec000000001', 'e00000000002');
    expect(next.sections[0]!.entries).toHaveLength(3);
  });

  it('未到建议上限：reached=false', () => {
    const doc = sec([entry('e00000000001', 'b00000000001')]);
    expect(entryLimitFor(doc, manifestWith(3), 'sec000000001')).toMatchObject({ limit: 3, count: 1, reached: false });
  });

  it('无 manifest / 无匹配规则 / 分区不存在：不提示（null）', () => {
    const doc = sec([entry('e00000000001', 'b00000000001')]);
    expect(entryLimitFor(doc, undefined, 'sec000000001')).toBeNull();
    expect(entryLimitFor(doc, { sections: [] } as unknown as TemplateManifest, 'sec000000001')).toBeNull();
    expect(entryLimitFor(doc, manifestWith(9), 'sec000000099')).toBeNull();
  });

  it('条目不存在：no-op（返回原 doc 引用）', () => {
    const doc = sec([entry('e00000000001', 'b00000000001')]);
    expect(duplicateEntry(doc, 'sec000000001', 'e00000000099')).toBe(doc);
  });

  it('真实模板 manifest：education 建议上限参与判定', () => {
    const manifest = getBuiltinTemplate('tpl-classic')?.manifest;
    expect(manifest).toBeTruthy();
    const limit = manifest!.sections.find((s) => s.type === 'education')!.maxEntries;
    const entries = Array.from({ length: limit }, (_, i) =>
      entry(`e${String(i).padStart(11, '0')}`, `b${String(i).padStart(11, '0')}`),
    );
    const doc = sec(entries);
    expect(entryLimitFor(doc, manifest, 'sec000000001')).toMatchObject({ limit, reached: true });
    expect(duplicateEntry(doc, 'sec000000001', entries[0]!.id).sections[0]!.entries).toHaveLength(limit + 1);
  });
});
