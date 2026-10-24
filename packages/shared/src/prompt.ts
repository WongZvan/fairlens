import { z } from 'zod';
import { RubricDimension } from './evaluation.js';

/** mustache 风格 {{placeholder}} 模板（发布前 zod 校验） */
export const ScenarioKey = z.enum(['revise', 'evaluate', 'walkthrough', 'structure', 'interview']);
export type ScenarioKey = z.infer<typeof ScenarioKey>;

export const PromptTemplate = z.object({
  template: z.string().min(1),
  version: z.number().int().positive(),
});

export const PromptSet = z.object({
  revise: PromptTemplate,
  evaluate: PromptTemplate,
  walkthrough: PromptTemplate,
  structure: PromptTemplate,
});

export const PromptPack = z.object({
  verticalId: z.string().min(1),
  displayName: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['draft', 'published']),
  prompts: PromptSet,
  rubric: z.array(RubricDimension).min(1),
});
export type PromptPack = z.infer<typeof PromptPack>;

/** 分层提示词预留（v1.8）：专家附加指导语，独立签名包，与基础模板版本解耦 */
export const SupplementEntry = z.object({
  scenario: ScenarioKey,
  text: z.string().min(1).max(2000), // 纯文本 ≤2000 字
});
export const SupplementPack = z.object({
  verticalId: z.string().min(1),
  version: z.number().int().positive(),
  author: z.string().min(1),
  entries: z.array(SupplementEntry),
});
export type SupplementPack = z.infer<typeof SupplementPack>;

/**
 * 垂类 SPI（§4.4）。capabilities 为 1.0 预留类型位：
 * 垂类可声明 'code-editor' | 'question-bank' 等能力，客户端能力注册表据此挂载工作台组件。
 */
export interface VerticalPromptProvider {
  verticalId: string;
  displayName: string;
  getPrompts(): z.infer<typeof PromptSet>;
  getRubric(): z.infer<typeof RubricDimension>[];
  capabilities?: Array<'code-editor' | 'question-bank' | (string & {})>;
}
