/**
 * 条目副本 + 结构 gating（m1.4 尾项，docs/01 §5.2/§5.6）：
 * 结构命令经 manifest.sections[].maxEntries 校验；复制条目/要点均换新 id。
 * 纯函数：返回新 doc（不就地修改），便于单测锁定上限行为。
 */
import type { ResumeDoc, TemplateManifest } from '@fairlens/shared';
import { nanoid } from '../../lib/nanoid.js';

export type DuplicateEntryResult =
  | { ok: true; doc: ResumeDoc }
  | { ok: false; limit: number };

export function duplicateEntry(
  doc: ResumeDoc,
  manifest: TemplateManifest | undefined,
  sectionId: string,
  entryId: string,
): DuplicateEntryResult {
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) return { ok: true, doc };
  const idx = section.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return { ok: true, doc };

  const rule = manifest?.sections.find((r) => r.type === section.type);
  if (rule && section.entries.length >= rule.maxEntries) {
    return { ok: false, limit: rule.maxEntries };
  }

  const src = section.entries[idx]!;
  const copy = {
    ...src,
    id: nanoid(),
    bullets: src.bullets.map((b) => ({ ...b, id: nanoid() })),
  };
  const entries = [...section.entries];
  entries.splice(idx + 1, 0, copy);
  return {
    ok: true,
    doc: {
      ...doc,
      sections: doc.sections.map((s) => (s.id === sectionId ? { ...s, entries } : s)),
    },
  };
}
