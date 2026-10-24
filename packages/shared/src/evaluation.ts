import { z } from 'zod';
import { Iso8601, Nanoid12 } from './common.js';

export const Severity = z.enum(['high', 'mid', 'low']);

export const RubricDimension = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  weight: z.number().min(0).max(1), // Σ=1 由内置包校验
  description: z.string().min(1),
  promptHint: z.string().optional(),
});
export type RubricDimension = z.infer<typeof RubricDimension>;

export const Finding = z.object({
  blockId: Nanoid12.nullable(),
  severity: Severity,
  message: z.string().min(1),
  suggestion: z.string(),
  authorId: z.string().optional(), // v0.1 恒 'ai'；真人协作批注预留（1.0）
});
export type Finding = z.infer<typeof Finding>;

export const DimensionReport = z.object({
  dimensionId: z.string().min(1),
  score: z.number().min(0).max(100),
  level: z.enum(['优', '良', '中', '差']),
  findings: z.array(Finding),
});

export const EvaluationReport = z.object({
  verticalId: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.number().int().positive(),
  evaluatedAt: Iso8601,
  overall: z.number().min(0).max(100),
  dimensions: z.array(DimensionReport).min(1),
  summary: z.string(), // 衬线评语区文本
  jdId: Nanoid12.optional(), // JD 一等实体引用（评估输入为 JobDescription 时记录）
  matchGeneric: z.boolean().optional(), // 无 JD 时 match=通用口径徽标（§7）
});
export type EvaluationReport = z.infer<typeof EvaluationReport>;

/** 评估与走查统一：review session（§5.5/§9.1） */
export const ReviewSession = z.object({
  id: Nanoid12,
  resumeId: Nanoid12,
  source: z.enum(['evaluation', 'walkthrough']),
  report: EvaluationReport,
  createdAt: Iso8601,
});
export type ReviewSession = z.infer<typeof ReviewSession>;
