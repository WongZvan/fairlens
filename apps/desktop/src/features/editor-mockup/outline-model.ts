/**
 * 大纲完整树模型（#118）：纯函数，组件只负责渲染。
 * 规则（用户 2026-11-05 拍板）：
 * - 分区标题=section.title（空则回落类型 i18n）；所有分区都显示（含空基本信息）；
 * - 条目全部显示（#127 起含空条目——新建条目必须先在大纲里可见，否则无法排序/定位；标题回落「未命名条目」）；
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
    const entries = section.entries;
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

/**
 * 分区在树里的显示名（#121 后 type 可为任意字符串）：
 * 有标题用标题；无标题时内置类型走 i18n，自定义类型回落 type 原文
 * （不能一律回落 `paper.basic`——那会把「自我评价」显示成「基本信息」）。
 */
export function outlineSectionLabel(
  section: Section,
  t: (key: string) => string,
  builtinKeys: Record<string, string>,
): string {
  const title = section.title.trim();
  if (title) return title;
  const key = builtinKeys[section.type];
  return key ? t(key) : section.type;
}
