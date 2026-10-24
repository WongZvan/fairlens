import { z } from 'zod';
import { Nanoid12 } from './common.js';
import { ScenarioKey } from './prompt.js';

/** 厂商预设：纯预填书签（非格式适配，§6.1）——模型名不内置 */
export const PresetId = z.enum(['deepseek', 'qwen', 'glm', 'doubao', 'openai', 'custom']);
export type PresetId = z.infer<typeof PresetId>;

export const LlmProviderConfig = z.object({
  id: Nanoid12,
  label: z.string().min(1),
  preset: PresetId.optional(),
  baseURL: z.string().url(),
  apiKeyRef: z.string().min(1), // → stronghold 条目；明文 Key 不落 SQLite
  model: z.string().min(1), // GET /models 拉取 + 手输 + 最近使用
  contextWindow: z
    .number()
    .int()
    .positive()
    .refine((n) => [8192, 32768, 131072, 1000000].includes(n) || n >= 4096, {
      message: '上下文窗口为声明式正整数（常见档 8K/32K/128K/1M）',
    })
    .optional(),
  effort: z.enum(['low', 'medium', 'high']).optional(), // 按厂商翻译；不支持则忽略
  maxTokens: z.number().int().positive().optional(), // 默认 4096
  extraHeaders: z.record(z.string()).optional(),
});
export type LlmProviderConfig = z.infer<typeof LlmProviderConfig>;

/** 场景分配：四场景（interview 预留 1.0）各自指派 Provider */
export const ScenarioAssign = z.object({
  revise: Nanoid12,
  evaluate: Nanoid12,
  walkthrough: Nanoid12,
  structure: Nanoid12,
});
export type ScenarioAssign = z.infer<typeof ScenarioAssign>;

/** 多轮会话实体（模拟面试地基，预留至 1.0） */
export const ConversationSession = z.object({
  id: Nanoid12,
  scenario: ScenarioKey,
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  contextRef: z.object({ resumeId: Nanoid12.optional(), jdId: Nanoid12.optional() }).optional(),
});
export type ConversationSession = z.infer<typeof ConversationSession>;

/** 预设书签表（静态数据；docs 链接供设置页教程跳转） */
export const PROVIDER_PRESETS: ReadonlyArray<{
  id: Exclude<z.infer<typeof PresetId>, 'custom'>;
  label: string;
  baseURL: string;
  docs: string;
}> = [
  { id: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', docs: 'https://platform.deepseek.com/api_keys' },
  { id: 'qwen', label: '通义千问（兼容模式）', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', docs: 'https://bailian.console.aliyun.com/' },
  { id: 'glm', label: '智谱 GLM', baseURL: 'https://open.bigmodel.cn/api/paas/v4', docs: 'https://open.bigmodel.cn/usercenter/apikeys' },
  { id: 'doubao', label: '火山方舟·豆包', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', docs: 'https://console.volcengine.com/ark' },
  { id: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1', docs: 'https://platform.openai.com/api-keys' },
];
