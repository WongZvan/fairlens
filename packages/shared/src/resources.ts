import { z } from 'zod';
import { Iso8601, Nanoid12 } from './common.js';

/** .fairlens 双语义（v1.4 §4.7）：
 *  resume=单份简历（含其全部历史），双击直接进编辑器（新简历副本）
 *  archive=全库备份包，打开进恢复确认界面 */
export const FairlensFileEntry = z.object({
  resume: z.unknown(), // ResumeRecord——由归档导入流程二次校验
  snapshots: z.array(z.unknown()),
  reviewSessions: z.array(z.unknown()),
  patchLog: z.array(z.unknown()),
});

export const FairlensFile = z.object({
  format: z.literal('fairlens-archive'),
  version: z.literal(1),
  kind: z.enum(['resume', 'archive']),
  exportedAt: Iso8601,
  resumes: z.array(FairlensFileEntry),
});
export type FairlensFile = z.infer<typeof FairlensFile>;

/** JD 一等实体（v1.9 §4.9）：JD 库/多岗匹配对比的地基 */
export const JobDescription = z.object({
  id: Nanoid12,
  title: z.string().min(1),
  company: z.string().optional(),
  rawText: z.string().min(1),
  parsedAt: Iso8601.optional(),
});
export type JobDescription = z.infer<typeof JobDescription>;

/** 资源清单契约（v1.7 §4.8）：静态资源中心数据源 */
export const ResourceRegistry = z.object({
  version: z.number().int().positive(),
  verticals: z.array(
    z.object({
      verticalId: z.string().min(1),
      displayName: z.string().min(1),
      latestVersion: z.number().int().positive(),
      packFile: z.string().min(1),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      intro: z.string(),
      changelog: z.string(),
      minAppVersion: z.string().min(1),
    }),
  ),
  templates: z.array(
    z.object({
      templateId: z.string().min(1),
      name: z.string().min(1),
      latestVersion: z.number().int().positive(),
      packFile: z.string().min(1),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      intro: z.string(),
      thumbnail: z.string().min(1),
      minAppVersion: z.string().min(1),
    }),
  ),
  guides: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), file: z.string().min(1), updated: z.string().min(1) })),
});
export type ResourceRegistry = z.infer<typeof ResourceRegistry>;
