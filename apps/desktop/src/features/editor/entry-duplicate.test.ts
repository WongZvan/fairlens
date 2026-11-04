import { describe, expect, it } from 'vitest';
import type { ResumeDoc, TemplateManifest } from '@fairlens/shared';
import { duplicateEntry } from './entry-duplicate.js';
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

describe('条目副本 + maxEntries 结构 gating', () => {
  it('未到上限：复制到原条目之后，条目/要点 id 全换新，原 doc 不变', () => {
    const doc = sec([entry('e00000000001', 'b00000000001'), entry('e00000000002', 'b00000000002')]);
    const result = duplicateEntry(doc, manifestWith(3), 'sec000000001', 'e00000000002');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = result.doc.sections[0]!.entries;
    expect(entries).toHaveLength(3);
    expect(entries[2]!.id).not.toBe('e00000000002');
    expect(entries[2]!.bullets[0]!.id).not.toBe('b00000000002');
    expect(entries[2]!.org).toBe('示例公司');
    // 原 doc 不被就地修改
    expect(doc.sections[0]!.entries).toHaveLength(2);
    expect(doc.sections[0]!.entries[1]!.id).toBe('e00000000002');
  });

  it('达到上限：blocked，返回 limit', () => {
    const doc = sec([entry('e00000000001', 'b00000000001'), entry('e00000000002', 'b00000000002')]);
    const result = duplicateEntry(doc, manifestWith(2), 'sec000000001', 'e00000000002');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.limit).toBe(2);
  });

  it('无 manifest / 无匹配分区规则：不 gating（照常复制）', () => {
    const doc = sec([entry('e00000000001', 'b00000000001')]);
    const noManifest = duplicateEntry(doc, undefined, 'sec000000001', 'e00000000001');
    expect(noManifest.ok).toBe(true);
    const noRule = duplicateEntry(doc, { sections: [] } as unknown as TemplateManifest, 'sec000000001', 'e00000000001');
    expect(noRule.ok).toBe(true);
  });

  it('分区或条目不存在：no-op（返回原 doc 引用）', () => {
    const doc = sec([entry('e00000000001', 'b00000000001')]);
    const missingSection = duplicateEntry(doc, manifestWith(9), 'sec000000099', 'e00000000001');
    expect(missingSection.ok).toBe(true);
    if (missingSection.ok) expect(missingSection.doc).toBe(doc);
    const missingEntry = duplicateEntry(doc, manifestWith(9), 'sec000000001', 'e00000000099');
    expect(missingEntry.ok).toBe(true);
    if (missingEntry.ok) expect(missingEntry.doc).toBe(doc);
  });

  it('真实模板 manifest 可用：education 上限参与判定', () => {
    const manifest = getBuiltinTemplate('tpl-classic')?.manifest;
    expect(manifest).toBeTruthy();
    const limit = manifest!.sections.find((s) => s.type === 'education')!.maxEntries;
    const entries = Array.from({ length: limit }, (_, i) =>
      entry(`e${String(i).padStart(11, '0')}`, `b${String(i).padStart(11, '0')}`),
    );
    const result = duplicateEntry(sec(entries), manifest, 'sec000000001', entries[0]!.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.limit).toBe(limit);
  });
});
