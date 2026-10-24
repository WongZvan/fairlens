import { z } from 'zod';
import { Nanoid12, SafeHref, YearMonth } from './common.js';

/** 行内标记：仅 加粗/斜体/链接 三种（schema 封闭性，§5.2 权限矩阵） */
export const Run = z.object({
  text: z.string().min(1),
  bold: z.literal(true).optional(),
  italic: z.literal(true).optional(),
  href: SafeHref.optional(),
});
export type Run = z.infer<typeof Run>;

export const Bullet = z.object({ id: Nanoid12, runs: z.array(Run).min(1) });
export type Bullet = z.infer<typeof Bullet>;

export const Entry = z
  .object({
    id: Nanoid12,
    org: z.string().min(1),
    role: z.string().optional(),
    start: YearMonth.optional(),
    end: YearMonth.optional(),
    ongoing: z.boolean().optional(),
    bullets: z.array(Bullet),
    pageBreakBefore: z.boolean().optional(), // 语义分页标记（manifest 开关）
  })
  .strict()
  .refine((e) => !e.end || !e.start || e.end >= e.start, {
    message: 'end 必须不早于 start',
    path: ['end'],
  })
  .refine((e) => !(e.ongoing && e.end), {
    message: 'ongoing 时不得有 end',
    path: ['end'],
  });
export type Entry = z.infer<typeof Entry>;

export const BasicField = z.object({
  id: Nanoid12,
  label: z.string().min(1),
  value: z.string(),
  href: SafeHref.optional(), // GitHub/博客/作品集语义链接字段
});
export type BasicField = z.infer<typeof BasicField>;

/** 照片槽：模板声明制；blobRef 指向本地资产库（§4.1） */
export const PhotoSlot = z.object({
  id: Nanoid12,
  mime: z.enum(['image/jpeg', 'image/png']),
  blobRef: z.string().min(1),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
export type PhotoSlot = z.infer<typeof PhotoSlot>;

export const SkillGroup = z.object({ id: Nanoid12, name: z.string().min(1), items: z.array(z.string()) });

export const SECTION_TYPES = ['basic', 'education', 'experience', 'project', 'skill'] as const;
export const Section = z.object({
  id: Nanoid12,
  type: z.enum(SECTION_TYPES),
  title: z.string().min(1),
  basicFields: z.array(BasicField).optional(),
  photo: PhotoSlot.optional(),
  entries: z.array(Entry),
  skills: z.array(SkillGroup).optional(),
});
export type Section = z.infer<typeof Section>;

/** 受控样式选项三维（v1.5 §5.8）：值必须 ∈ 模板声明集（越界由 manifest 校验拒绝） */
export const Density = z.enum(['auto', 'compact', 'normal', 'loose']);
export const DocStyle = z.object({
  fontTheme: z.string().optional(),
  density: Density.optional(),
  accent: z.string().optional(),
});
export type DocStyle = z.infer<typeof DocStyle>;

/** ResumeDoc：存储/快照/diff/导出的统一格式（三投影唯一数据源） */
export const ResumeDoc = z.object({
  templateId: z.string().min(1),
  style: DocStyle.optional(),
  sections: z.array(Section).min(1),
});
export type ResumeDoc = z.infer<typeof ResumeDoc>;

export const ResumeRecord = z.object({
  id: Nanoid12,
  title: z.string().min(1),
  verticalId: z.string().default('general'),
  doc: ResumeDoc,
  status: z.enum(['active', 'archived']).default('active'),
});
export type ResumeRecord = z.infer<typeof ResumeRecord>;
