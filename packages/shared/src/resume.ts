import { z } from 'zod';
import { isYearMonth, Nanoid12, SafeHref } from './common.js';

/** 行内标记：仅 加粗/斜体/链接 三种（schema 封闭性，§5.2 权限矩阵） */
export const Run = z.object({
  text: z.string().min(1),
  bold: z.literal(true).optional(),
  italic: z.literal(true).optional(),
  href: SafeHref.optional(),
});
export type Run = z.infer<typeof Run>;

/** 要点层级缩进（#123）：0 缺省不落库；两层足够（三层行宽会塌） */
export const BulletDepth = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type BulletDepth = z.infer<typeof BulletDepth>;

export const Bullet = z.object({
  id: Nanoid12,
  runs: z.array(Run).min(1),
  depth: BulletDepth.optional(),
});
export type Bullet = z.infer<typeof Bullet>;

export const Entry = z
  .object({
    id: Nanoid12,
    org: z.string().min(1),
    role: z.string().optional(),
    // #122 日期放开为自由文本：'2022'、'2022年9月'、'2022.09.15'、'大三' 均合法
    start: z.string().optional(),
    end: z.string().optional(),
    ongoing: z.boolean().optional(),
    bullets: z.array(Bullet),
    pageBreakBefore: z.boolean().optional(), // 语义分页标记（manifest 开关）
  })
  .strict()
  .refine((e) => !(isYearMonth(e.start) && isYearMonth(e.end)) || e.end >= e.start, {
    // 仅当两端都是可比较的 YYYY.MM 时才校验先后；自由文本不做序关系断言
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
export type SkillGroup = z.infer<typeof SkillGroup>;

/**
 * 内置分区类型（2026-11-13 #121 起**不再封闭**）：
 * `Section.type` 为自由字符串，此常量仅供 manifest 规则命中与新建对话框的预设标题使用。
 * 未知 type 的处理约定：duo 归主栏、大纲空标题回落 type 原文、不限条目数。
 */
export const BUILTIN_SECTION_TYPES = ['basic', 'education', 'experience', 'project', 'skill'] as const;
export type BuiltinSectionType = (typeof BUILTIN_SECTION_TYPES)[number];

export const Section = z.object({
  id: Nanoid12,
  type: z.string().min(1),
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

/** 页头（2026-11-05，#117；2026-11-13 #122 增 fields）：三项固定 + 可自由增删的附加字段 */
export const Profile = z.object({
  name: z.string().min(1),
  headline: z.string().optional(),
  contactLine: z.string().optional(),
  /** 附加字段（籍贯/政治面貌/个人网站…）；复用 BasicField 契约，模板不保证渲染全部 */
  fields: z.array(BasicField).optional(),
});
export type Profile = z.infer<typeof Profile>;

/** ResumeDoc：存储/快照/diff/导出的统一格式（三投影唯一数据源） */
export const ResumeDoc = z.object({
  templateId: z.string().min(1),
  style: DocStyle.optional(),
  profile: Profile.optional(),
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
