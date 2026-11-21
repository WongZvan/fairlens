/**
 * 空白简历构造（#127）：示例 → 空白 的落点。
 *
 * 契约约束：`sections.min(1)`、`Section.title.min(1)`。
 * 2026-11-21（#128）：`Profile.name` 已允许为空——空白简历**不编造姓名**，
 * 画布用占位文案显示「你的姓名」，导出前由 UI 拦截并提示补全。
 */
import { ResumeDoc } from '@fairlens/shared';
import { nanoid } from '../../lib/nanoid.js';

export interface BlankDocLabels {
  /** 基本信息分区标题 */
  basicSection: string;
}

export function createBlankDoc(labels: BlankDocLabels, templateId = 'tpl-classic'): ResumeDoc {
  return ResumeDoc.parse({
    templateId,
    profile: { name: '' },
    sections: [{ id: nanoid(), type: 'basic', title: labels.basicSection, entries: [] }],
  });
}
