import { z } from 'zod';
import { Nanoid12 } from './common.js';
import { ResumeDoc, ResumeRecord } from './resume.js';

/**
 * 持久层契约（m1.6）——与 docs/01 附录 B SQLite DDL 对应。
 * 列名 snake_case（DDL），此处为结构化契约；doc_json 序列化归属 adapter 层。
 */

/** 快照触发来源（§5.6）：ai-accept=块级修订采纳后 | manual=用户手动 | pre-eval=评估/走查开始前 */
export const SnapshotTrigger = z.enum(['ai-accept', 'manual', 'pre-eval']);
export type SnapshotTrigger = z.infer<typeof SnapshotTrigger>;

/** resume_snapshots 表行；doc.templateId 即 DDL 列 template_id（写入同源，读取时以 doc 为准） */
export const SnapshotRow = z.object({
  id: Nanoid12,
  resumeId: Nanoid12,
  doc: ResumeDoc,
  label: z.string().optional(),
  trigger: SnapshotTrigger,
  createdAt: z.string().min(1), // ISO 8601
});
export type SnapshotRow = z.infer<typeof SnapshotRow>;

/** resumes 表行 = ResumeRecord + 审计时间戳（列 created_at/updated_at） */
export const ResumeRow = ResumeRecord.extend({
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type ResumeRow = z.infer<typeof ResumeRow>;

/**
 * settings 表 key（m1.6 范围）：autosave=§5.7 双模式开关（默认 true）；
 * bgMode/bgImage/bgOpacity/bgFit=#86 画布背景四键预留（消费方 m1.4 背景层/m2.3 配置 UI）
 */
export const SettingKey = z.enum(['autosave', 'bgMode', 'bgImage', 'bgOpacity', 'bgFit']);
export type SettingKey = z.infer<typeof SettingKey>;

export const BgMode = z.enum(['light', 'dark', 'theme', 'custom']);
export type BgMode = z.infer<typeof BgMode>;

export const BgFit = z.enum(['contain', 'center', 'tile', 'cover']);
export type BgFit = z.infer<typeof BgFit>;

/** 按键分型的 value_json schema（parse/默认值编排在 core/settings） */
export const SettingValueSchemas = {
  autosave: z.boolean(),
  bgMode: BgMode,
  bgImage: z.string().min(1).nullable(), // 应用数据目录内相对路径；null=清除
  bgOpacity: z.number().int().min(0).max(100),
  bgFit: BgFit,
} as const;
