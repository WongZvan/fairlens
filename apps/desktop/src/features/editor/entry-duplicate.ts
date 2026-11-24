/**
 * 条目副本 + 篇幅建议（m1.4 尾项；#130 修订）：
 * `maxEntries` 是**建议上限**，不是硬限制——导入可全量保留（正常分页），
 * 编辑器复制在达到建议上限时由 UI 先弹确认，确认后允许复制（不截断、不隐藏）。
 * 本文件保持纯函数：`entryLimitFor` 只报告状态，`duplicateEntry` 只做复制。
 */
import type { ResumeDoc, TemplateManifest } from '@fairlens/shared';
import { nanoid } from '../../lib/nanoid.js';

export interface EntryLimit {
  /** 模板建议上限 */
  limit: number;
  /** 当前条目数 */
  count: number;
  /** 已达/超过建议上限（UI 应先确认） */
  reached: boolean;
}

/** 某分区的建议上限状态；分区不存在、无 manifest、无匹配规则 → null（不提示） */
export function entryLimitFor(
  doc: ResumeDoc,
  manifest: TemplateManifest | undefined,
  sectionId: string,
): EntryLimit | null {
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const rule = manifest?.sections.find((r) => r.type === section.type);
  if (!rule) return null;
  return {
    limit: rule.maxEntries,
    count: section.entries.length,
    reached: section.entries.length >= rule.maxEntries,
  };
}

/** 条目所属分区 id；找不到返回 null（供统一复制入口使用） */
export function sectionIdForEntry(doc: ResumeDoc, entryId: string): string | null {
  for (const section of doc.sections) {
    if (section.entries.some((e) => e.id === entryId)) return section.id;
  }
  return null;
}

export type DuplicatePlan =
  | { kind: 'duplicate'; doc: ResumeDoc }
  | { kind: 'needs-confirm'; limit: EntryLimit };

/**
 * 复制入口的统一决策：达到建议上限 → needs-confirm（**不修改 doc**，取消即无新增）；
 * 未达上限 → 直接返回复制后的 doc。
 */
export function planDuplicateEntry(
  doc: ResumeDoc,
  manifest: TemplateManifest | undefined,
  sectionId: string,
  entryId: string,
): DuplicatePlan {
  const limit = entryLimitFor(doc, manifest, sectionId);
  if (limit?.reached) return { kind:'needs-confirm', limit };
  return { kind:'duplicate', doc: duplicateEntry(doc, sectionId, entryId) };
}

/** 复制条目到原条目之后（条目/要点 id 全换新）；分区或条目不存在时返回原 doc 引用 */
export function duplicateEntry(doc: ResumeDoc, sectionId: string, entryId: string): ResumeDoc {
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) return doc;
  const idx = section.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return doc;

  const src = section.entries[idx]!;
  const copy = {
    ...src,
    id: nanoid(),
    bullets: src.bullets.map((b) => ({ ...b, id: nanoid() })),
  };
  const entries = [...section.entries];
  entries.splice(idx + 1, 0, copy);
  return {
    ...doc,
    sections: doc.sections.map((s) => (s.id === sectionId ? { ...s, entries } : s)),
  };
}
