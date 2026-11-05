/**
 * 大纲完整树模型（#118）：纯函数，组件只负责渲染。
 * 规则（用户 2026-11-05 拍板）：
 * - 分区标题=section.title（空则回落类型 i18n）；所有分区都显示（含空基本信息）；
 * - 条目仅保留有 bullet 的（空壳不进树，仍可拖拽排序）；
 * - basicFields/skillGroups 作为只读导航叶节点。
 */
import type { BasicField, Entry, ResumeDoc, Section, SkillGroup } from '@fairlens/shared';

export interface OutlineSection {
  /** 原始 section（拖拽排序需要原始 entries 索引） */
  section: Section;
  id: string;
  type: Section['type'];
  /** null = 组件回落类型 i18n */
  title: string | null;
  entries: Entry[];
  fields: BasicField[];
  skills: SkillGroup[];
  hasChildren: boolean;
}

export function buildOutlineTree(doc: ResumeDoc): OutlineSection[] {
  return doc.sections.map((section) => {
    const entries = section.entries.filter((entry) => entry.bullets.length > 0);
    const fields = section.basicFields ?? [];
    const skills = section.skills ?? [];
    return {
      section,
      id: section.id,
      type: section.type,
      title: section.title.trim() || null,
      entries,
      fields,
      skills,
      hasChildren: entries.length > 0 || fields.length > 0 || skills.length > 0,
    };
  });
}

export function outlineFieldLabel(field: BasicField): string {
  return field.value.trim() || field.label;
}

export function outlineSkillLabel(group: SkillGroup): string {
  return group.items.map((item) => item.trim()).filter(Boolean).join(' · ') || group.name;
}
