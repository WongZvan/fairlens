/**
 * 空白简历构造（#127）：示例 → 空白 的落点。
 *
 * 契约约束：`sections.min(1)`、`Section.title.min(1)`、`Profile.name.min(1)`。
 * 所以"空白"不是空对象，而是：一个占位姓名（用户第一件事就是改掉）+ 一个空的基本信息分区。
 * 页头姓名用占位文案，导出前用户必然要改——比编造一个假姓名诚实。
 */
import { ResumeDoc } from '@fairlens/shared';
import { nanoid } from '../../lib/nanoid.js';

export interface BlankDocLabels {
  /** 占位姓名（如「你的姓名」） */
  name: string;
  /** 基本信息分区标题 */
  basicSection: string;
}

export function createBlankDoc(labels: BlankDocLabels, templateId = 'tpl-classic'): ResumeDoc {
  return ResumeDoc.parse({
    templateId,
    profile: { name: labels.name },
    sections: [{ id: nanoid(), type: 'basic', title: labels.basicSection, entries: [] }],
  });
}
