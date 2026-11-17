/**
 * 文档投影（2026-11-13，#119 AI 读取契约）：把 ResumeDoc 投影成「带块锚点的可审计文本」，
 * 并能把模型改写的单行 Markdown 反解回 Run[]。
 *
 * 为什么是投影而不是切片：
 * - 目标（用户拍板）= 提高改写精度，不是应对超长上下文。简历 3 页实测量级远小于任何上下文窗口，
 *   切片只会让模型看不到上下文、改错行；真正的精度来源是「每行都能被唯一定位」。
 * - 所以行单位 = 语义行 = Bullet（换行只由 hardBreak 产生，编码为文本内的 \n），
 *   与 blockId 一一对应；投影里的每个 [id] 都是 v1 「回写」的定位键。
 *
 * 为什么不复用 snapshot-diff 的 runsText：它截断到 40 字（UI label 用途），
 * 投影必须无损，否则模型看到的是残缺句，改写结果必然失真。
 *
 * 纯函数、零 DOM / 零 Tauri 依赖（§2.3 分层职责）；M3 修订闭环与 M4 走查共用本模块。
 */
import type { Entry, ResumeDoc, Run, Section } from '@fairlens/shared';
import { formatDateRange } from './entry-date.js';

// ---------------------------------------------------------------------------
// Token 估算（§6.3「中文 1.5 字≈1token」+ 安全系数）
// ---------------------------------------------------------------------------

/** CJK 字符 → token 的经验除数（文档口径） */
const CJK_CHARS_PER_TOKEN = 1.5;
/** 非 CJK 字符 → token 的经验除数（英文/数字/符号） */
const ASCII_CHARS_PER_TOKEN = 4;
/**
 * 安全系数：文档原口径对中文密集文本偏乐观（BPE 分词存在长尾），
 * 预算判断宁可高估。1.2 是保守值，单测锁定以免无意改动。
 */
const TOKEN_SAFETY_FACTOR = 1.2;

/** 估算 token 数（向上取整；空串=0）。口径=混合估算 × 安全系数。 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let cjk = 0;
  for (const ch of text) {
    // CJK 统一表意 + 中日韩标点全角区；经验上这批字符按 1.5 字/token
    if (/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(ch)) cjk += 1;
  }
  const rest = text.length - cjk;
  const raw = cjk / CJK_CHARS_PER_TOKEN + rest / ASCII_CHARS_PER_TOKEN;
  return Math.ceil(raw * TOKEN_SAFETY_FACTOR);
}

// ---------------------------------------------------------------------------
// Run[] ⇄ 单行 Markdown（无损编解码）
// ---------------------------------------------------------------------------

/** Markdown 特殊字符 → 反斜杠转义（只转义会破坏本编码器的字符） */
function escapeText(text: string): string {
  return text.replace(/[\\*[\]()]/g, (m) => `\\${m}`);
}

function unescapeText(text: string): string {
  return text.replace(/\\([\\*[\]()])/g, '$1');
}

/**
 * 单段 Run → Markdown 片段。
 * 嵌套顺序固定为 link 最内 → italic → bold（编码/解码两端同序，保证往返一致）。
 */
function runToMarkdown(run: Run): string {
  let body = escapeText(run.text);
  if (run.italic) body = `*${body}*`;
  if (run.bold) body = `**${body}**`;
  if (run.href) body = `[${body}](${run.href})`;
  return body;
}

/**
 * Run[] → 单行 Markdown（bullet 的 runs 全部拼接）。
 * hardBreak 在契约里已编码成文本内的 `\n`，此处原样保留（不转义换行）——
 * 语义行仍然是「一个 bullet」，视觉换行不影响 blockId 锚定。
 */
export function runsToMarkdown(runs: Run[]): string {
  return runs.map(runToMarkdown).join('');
}

type Style = { bold?: true; italic?: true; href?: string };

interface Segment extends Style {
  text: string;
}

/** 从 `[label](url)` 里切出 url：括号配平（url 内允许成对括号） */
function readLinkTarget(line: string, openIndex: number): { label: string; url: string; end: number } | null {
  // line[openIndex] === '['
  let depth = 0;
  let closeBracket = -1;
  for (let i = openIndex; i < line.length; i += 1) {
    if (line[i] === '\\') {
      i += 1;
      continue;
    }
    if (line[i] === '[') depth += 1;
    else if (line[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        closeBracket = i;
        break;
      }
    }
  }
  if (closeBracket < 0) return null;
  if (line[closeBracket + 1] !== '(') return null;

  let parenDepth = 1;
  for (let i = closeBracket + 2; i < line.length; i += 1) {
    if (line[i] === '(') parenDepth += 1;
    else if (line[i] === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        const url = line.slice(closeBracket + 2, i).trim();
        if (!url) return null;
        return { label: line.slice(openIndex + 1, closeBracket), url, end: i + 1 };
      }
    }
  }
  return null;
}

/** 同一字符连续出现长度（最多 3：`***` = 粗+斜） */
function runLength(line: string, index: number, ch: string): number {
  let n = 0;
  while (n < 3 && line[index + n] === ch) n += 1;
  return n;
}

/**
 * 宽松解析单行 Markdown → 分段（带样式旗标）。
 * 支持 `**b**` / `__b__` / `*i*` / `_i_` / `***bi***` / `[t](url)`（label 内可再含样式）；
 * 不做完整 CommonMark——模型实际只产出这几种，不成对的标记按字面文本处理（不抛错）。
 * 转义 `\*` `\[` `\]` `\(` `\)` `\\` 在叶层还原。
 */
function splitMarks(line: string, inherited: Style = {}): Segment[] {
  const out: Segment[] = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ ...inherited, text: unescapeText(buf) });
      buf = '';
    }
  };

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;

    if (ch === '\\' && i + 1 < line.length) {
      buf += ch + line[i + 1]!;
      i += 1;
      continue;
    }

    if (ch === '[') {
      const target = readLinkTarget(line, i);
      if (target) {
        flush();
        out.push(...splitMarks(target.label, { ...inherited, href: target.url }));
        i = target.end - 1;
        continue;
      }
      buf += ch;
      continue;
    }

    if (ch === '*' || ch === '_') {
      const openLen = runLength(line, i, ch);
      const marker = ch.repeat(openLen);
      const contentStart = i + openLen;
      const close = line.indexOf(marker, contentStart);
      if (close > contentStart) {
        flush();
        const inner = line.slice(contentStart, close);
        const style: Style = { ...inherited };
        if (openLen >= 2) style.bold = true;
        if (openLen === 1 || openLen === 3) style.italic = true;
        out.push(...splitMarks(inner, style));
        i = close + openLen - 1;
        continue;
      }
      buf += ch;
      continue;
    }

    buf += ch;
  }
  flush();
  return out;
}

function sameStyle(a: Segment | Run, b: Segment | Run): boolean {
  return Boolean(a.bold) === Boolean(b.bold) && Boolean(a.italic) === Boolean(b.italic) && a.href === b.href;
}

/**
 * 单行 Markdown → Run[]。
 * 返回 null = 不可用（只产出空文本）；调用方必须拒绝该 patch 而不是静默写入。
 * 相邻**同样式**片段合并（合并后 diff 更稳定、字数更少）。
 */
export function markdownToRuns(markdown: string): Run[] | null {
  const segments = splitMarks(markdown);
  const runs: Run[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const prev = runs[runs.length - 1];
    if (prev && !seg.href && !prev.href && sameStyle(prev, seg)) {
      prev.text += seg.text;
      continue;
    }
    const run: Run = { text: seg.text };
    if (seg.bold) run.bold = true;
    if (seg.italic) run.italic = true;
    if (seg.href) run.href = seg.href;
    runs.push(run);
  }
  return runs.length > 0 ? runs : null;
}

// ---------------------------------------------------------------------------
// 投影树
// ---------------------------------------------------------------------------

export interface ProjectedLine {
  blockId: string;
  /** 单行 Markdown（可经 markdownToRuns 反解） */
  markdown: string;
  /** 层级缩进（#123）：0 省略；渲染时每级加两个空格 */
  depth?: 1 | 2;
}

export interface ProjectedField {
  blockId: string;
  label: string;
  value: string;
  href?: string;
}

export interface ProjectedEntry {
  blockId: string;
  /** 结构化头（org / role / 日期），不参与就地改写，只做上下文；#127 起新建条目可以还没有 org */
  org?: string;
  role?: string;
  date?: string;
  pageBreakBefore?: boolean;
  lines: ProjectedLine[];
}

export interface ProjectedSkillGroup {
  blockId: string;
  name: string;
  items: string[];
}

export interface ProjectedSection {
  blockId: string;
  type: Section['type'];
  title: string;
  fields: ProjectedField[];
  entries: ProjectedEntry[];
  skills: ProjectedSkillGroup[];
  /** 照片槽只报告存在性（二进制内容不进 prompt） */
  hasPhoto: boolean;
}

export interface ProjectedProfile {
  name: string;
  headline?: string;
  contactLine?: string;
}

export interface DocProjection {
  templateId: string;
  profile?: ProjectedProfile;
  sections: ProjectedSection[];
}

function projectEntry(entry: Entry): ProjectedEntry {
  const date = formatDateRange(entry.start, entry.end, entry.ongoing);
  return {
    blockId: entry.id,
    ...(entry.org ? { org: entry.org } : {}),
    ...(entry.role ? { role: entry.role } : {}),
    ...(date ? { date } : {}),
    ...(entry.pageBreakBefore ? { pageBreakBefore: true } : {}),
    lines: entry.bullets
      .filter((b) => b.runs.length > 0)
      .map((b) => ({
        blockId: b.id,
        markdown: runsToMarkdown(b.runs),
        ...(b.depth === 1 || b.depth === 2 ? { depth: b.depth } : {}),
      }))
      .filter((l) => l.markdown.length > 0),
  };
}

function projectSection(section: Section): ProjectedSection {
  return {
    blockId: section.id,
    type: section.type,
    title: section.title,
    fields: (section.basicFields ?? []).map((f) => ({
      blockId: f.id,
      label: f.label,
      value: f.value,
      ...(f.href ? { href: f.href } : {}),
    })),
    entries: section.entries.map(projectEntry).filter((e) => e.lines.length > 0),
    skills: (section.skills ?? []).map((g) => ({ blockId: g.id, name: g.name, items: g.items })),
    hasPhoto: Boolean(section.photo),
  };
}

/** ResumeDoc → 投影树（不含 token 估算；估算见 renderProjection / estimateProjection） */
export function projectDoc(doc: ResumeDoc): DocProjection {
  return {
    templateId: doc.templateId,
    ...(doc.profile
      ? {
          profile: {
            name: doc.profile.name,
            ...(doc.profile.headline ? { headline: doc.profile.headline } : {}),
            ...(doc.profile.contactLine ? { contactLine: doc.profile.contactLine } : {}),
          },
        }
      : {}),
    sections: doc.sections.map(projectSection),
  };
}

// ---------------------------------------------------------------------------
// 渲染（给模型看的文本）
// ---------------------------------------------------------------------------

/**
 * 投影树 → 纯文本。格式刻意保持浅层，每行都带 [blockId]：
 *
 *   ## 实习经历  [sec_x]
 *   - 字节跳动 · 后端实习生 · 2025.06 – 2025.09  [ent_y]
 *     - 将接口 P99 从 340ms 降至 90ms  [bul_z]
 *   · 技能组：前端  [skg_w] Axure / Figma
 */
export function renderProjection(tree: DocProjection): string {
  const out: string[] = [];
  if (tree.profile) {
    const head = [`姓名：${tree.profile.name}`];
    // 数据里 headline 可能已自带「求职意向：」前缀（示例数据即如此）——不重复加
    if (tree.profile.headline) {
      const h = tree.profile.headline;
      head.push(/^求职意向[:：]/.test(h) ? h : `求职意向：${h}`);
    }
    if (tree.profile.contactLine) head.push(`联系方式：${tree.profile.contactLine}`);
    out.push('# 页头', head.join(' · '), '');
  }
  for (const section of tree.sections) {
    out.push(`## ${section.title}  [${section.blockId}]`);
    for (const field of section.fields) {
      out.push(`- ${field.label}：${field.value}  [${field.blockId}]`);
    }
    for (const group of section.skills) {
      // 技能条目内部常用「·」分隔，列表分隔符改「；」以免歧义
      out.push(`- 技能组「${group.name}」：${group.items.join('；')}  [${group.blockId}]`);
    }
    if (section.hasPhoto) out.push('- （此分区含照片，内容不参与文本处理）');
    for (const entry of section.entries) {
      const header = [entry.org, entry.role, entry.date].filter(Boolean).join(' · ');
      out.push(`- ${header}  [${entry.blockId}]`);
      for (const line of entry.lines) {
        // 层级缩进（#123）：每级两个空格，让模型看得出从属关系
        const indent = '  '.repeat(line.depth ?? 0);
        out.push(`  ${indent}- ${line.markdown}  [${line.blockId}]`);
      }
    }
    out.push('');
  }
  return out.join('\n').trimEnd();
}

/** 投影树的 token 估算（按渲染文本计） */
export function estimateProjection(tree: DocProjection): number {
  return estimateTokens(renderProjection(tree));
}

// ---------------------------------------------------------------------------
// 作用域切片（「按模块读」的唯一入口）
// ---------------------------------------------------------------------------

export type ProjectScope =
  | { kind: 'doc' }
  | { kind: 'section'; sectionId: string }
  | { kind: 'entry'; entryId: string };

/**
 * 按作用域切投影树。作用域外的块**完全不进** prompt（不是靠模型自己忽略）。
 * 找不到 id 时返回空 sections / 空 entries（调用方据此判定「目标已消失」，
 * 例如快照回滚后 old blockId 不复存在——不得静默降级成整篇）。
 */
export function projectScope(doc: ResumeDoc, scope: ProjectScope): DocProjection {
  const full = projectDoc(doc);
  if (scope.kind === 'doc') return full;

  if (scope.kind === 'section') {
    return { ...full, sections: full.sections.filter((s) => s.blockId === scope.sectionId) };
  }

  const sections = full.sections
    .map((s) => ({ ...s, entries: s.entries.filter((e) => e.blockId === scope.entryId) }))
    .map((s) => ({ ...s, fields: [] as ProjectedField[], skills: [] as ProjectedSkillGroup[], hasPhoto: false }))
    .filter((s) => s.entries.length > 0);
  return { ...full, sections };
}

/** 投影树里所有块锚点（自检/审计用：确认投影没造出原文不存在的 id） */
export function collectProjectedIds(tree: DocProjection): string[] {
  const ids: string[] = [];
  for (const section of tree.sections) {
    ids.push(section.blockId);
    for (const f of section.fields) ids.push(f.blockId);
    for (const g of section.skills) ids.push(g.blockId);
    for (const e of section.entries) {
      ids.push(e.blockId);
      for (const l of e.lines) ids.push(l.blockId);
    }
  }
  return ids;
}