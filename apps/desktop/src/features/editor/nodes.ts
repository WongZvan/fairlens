/**
 * FairLens 自定义节点体系（m1.3）：attrs ↔ 契约字段一一对应（docs/01 §5.3）。
 * 契约源=packages/shared/src/resume.ts——引用前去读源，勿凭记忆。
 *
 * schema 封闭性（§5.2 权限矩阵）：仅注册三种 mark（bold/italic/link）与六类节点；
 * 字体/字号/颜色等无 schema 表达——由 printCSS 模板令牌决定。
 */
import { Link } from '@tiptap/extension-link';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import type { ResumeDoc, Section } from '@fairlens/shared';

export const BLOCK_ID = 'data-block-id' as const;

function blockIdAttr() {
  return {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute(BLOCK_ID),
    renderHTML: (attrs: Record<string, unknown>) => (attrs[BLOCK_ID] ? { [BLOCK_ID]: attrs[BLOCK_ID] } : {}),
  };
}

/** 分区：五类之一；title 可编辑；entries 承载子节点 */
export const SectionNode = Node.create({
  name: 'flSection',
  group: 'block',
  content: 'flSectionHeader flEntry*',
  defining: true,
  addAttributes() {
    return {
      id: blockIdAttr(),
      type: { default: 'basic' },
      title: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: `section[data-type="fl-section"]` }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, { 'data-type': 'fl-section' }), 0];
  },
});

/** 分区标题（可选编辑，排版归模板） */
export const SectionHeaderNode = Node.create({
  name: 'flSectionHeader',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return { id: blockIdAttr() };
  },
  parseHTML() {
    return [{ tag: 'h3[data-type="fl-section-header"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['h3', mergeAttributes(HTMLAttributes, { 'data-type': 'fl-section-header' }), 0];
  },
});

/** 条目：org/role/start/end/ongoing 元数据 + bullets 子内容 + 语义分页标记 */
export const EntryNode = Node.create({
  name: 'flEntry',
  group: 'block',
  content: 'flEntryHeader flBullet*',
  defining: true,
  addAttributes() {
    return {
      id: blockIdAttr(),
      org: { default: '' },
      role: { default: null },
      start: { default: null },
      end: { default: null },
      ongoing: { default: null },
      pageBreakBefore: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'article[data-type="fl-entry"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['article', mergeAttributes(HTMLAttributes, { 'data-type': 'fl-entry' }), 0];
  },
});

/** 条目头部（org/role/date 的结构化行） */
export const EntryHeaderNode = Node.create({
  name: 'flEntryHeader',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return { id: blockIdAttr() };
  },
  parseHTML() {
    return [{ tag: 'header[data-type="fl-entry-header"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['header', mergeAttributes(HTMLAttributes, { 'data-type': 'fl-entry-header' }), 0];
  },
});

/** 要点：AI 修订的主目标块 */
export const BulletNode = Node.create({
  name: 'flBullet',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return { id: blockIdAttr() };
  },
  parseHTML() {
    return [{ tag: 'li[data-type="fl-bullet"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'fl-bullet' }), 0];
  },
});

/** 文档根级配置：templateId/style 走 ResumeDoc 层（非节点 attrs，序列化时合并） */
export const DocMeta = Extension.create({
  name: 'flDocMeta',
  addOptions() {
    return { templateId: 'tpl-classic' };
  },
});

/** mark：三种之外不存在（Link 扩展自带 href；Bold/Italic 由 StarterKit 提供） */
export const linkMark = Link.configure({ openOnClick: false, autolink: true });

export const flExtensions = [
  SectionNode,
  SectionHeaderNode,
  EntryNode,
  EntryHeaderNode,
  BulletNode,
  DocMeta,
  linkMark,
] as const;

/* ─────────────── 序列化：ResumeDoc ↔ ProseMirror JSON ─────────────── */

interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

function runsOf(pm: PMNode | undefined): Array<{ text: string; bold?: true; italic?: true; href?: string }> {
  if (!pm?.content) return [];
  return pm.content.flatMap((c) => {
    if (c.type !== 'text' || !c.text) return [];
    const run: { text: string; bold?: true; italic?: true; href?: string } = { text: c.text };
    for (const m of c.marks ?? []) {
      if (m.type === 'bold') run.bold = true;
      if (m.type === 'italic') run.italic = true;
      if (m.type === 'link' && typeof m.attrs?.href === 'string') run.href = m.attrs.href;
    }
    return [run];
  });
}

function textOf(pm: PMNode | undefined): string {
  return (pm?.content ?? []).map((c) => c.text ?? '').join('');
}

/** PM 文档 → ResumeDoc（templateId/style 由调用方传入——DocMeta 不进节点树，序列化层合并） */
export function pmToResumeDoc(doc: PMNode, meta?: { templateId: string; style?: ResumeDoc['style'] }): ResumeDoc {
  const sections: Section[] = (doc.content ?? [])
    .filter((n): n is PMNode & { type: 'flSection' } => n.type === 'flSection')
    .map((sec) => {
      const header = sec.content?.find((n) => n.type === 'flSectionHeader');
      const entries = (sec.content ?? [])
        .filter((n): n is PMNode & { type: 'flEntry' } => n.type === 'flEntry')
        .map((e) => {
          // org 等元数据以 attrs 为准（flEntryHeader 仅是可视化行，不参与序列化）
          const entry: Record<string, unknown> = {
            id: String(e.attrs?.id ?? ''),
            org: String(e.attrs?.org ?? ''),
            bullets: (e.content ?? [])
              .filter((n): n is PMNode & { type: 'flBullet' } => n.type === 'flBullet')
              .map((b) => ({ id: String(b.attrs?.id ?? ''), runs: runsOf(b) })),
          };
          for (const k of ['role', 'start', 'end', 'ongoing', 'pageBreakBefore'] as const) {
            const v = e.attrs?.[k];
            if (v !== null && v !== undefined) entry[k] = v; // 契约为 absent≠undefined：仅写实际存在字段
          }
          return entry as unknown as Section['entries'][number];
        });
      return {
        id: String(sec.attrs?.id ?? ''),
        type: (sec.attrs?.type as Section['type']) ?? 'basic',
        title: (sec.attrs?.title as string) ?? textOf(header),
        entries,
      };
    });
  return { templateId: meta?.templateId ?? 'tpl-classic', ...(meta?.style ? { style: meta.style } : {}), sections };
}

/** ResumeDoc → PM 文档 JSON（编辑器初始内容） */
export function resumeDocToPm(doc: ResumeDoc): PMNode {
  return {
    type: 'doc',
    content: doc.sections.map((sec) => ({
      type: 'flSection',
      attrs: { id: sec.id, type: sec.type, title: sec.title },
      content: [
        { type: 'flSectionHeader', attrs: { id: sec.id }, content: [{ type: 'text', text: sec.title }] },
        ...sec.entries.map((e) => ({
          type: 'flEntry',
          attrs: {
            id: e.id,
            org: e.org,
            role: e.role ?? null,
            start: e.start ?? null,
            end: e.end ?? null,
            ongoing: e.ongoing ?? null,
            pageBreakBefore: e.pageBreakBefore ?? null,
          },
          content: [
            { type: 'flEntryHeader', attrs: { id: e.id }, content: [{ type: 'text', text: [e.org, e.role, e.start && e.end ? `${e.start} – ${e.end}` : ''].filter(Boolean).join(' · ') }] },
            ...e.bullets.map((b) => ({
              type: 'flBullet',
              attrs: { id: b.id },
              content: b.runs.map((r) => {
                const marks: PMNode['marks'] = [];
                if (r.bold) marks!.push({ type: 'bold' });
                if (r.italic) marks!.push({ type: 'italic' });
                if (r.href) marks!.push({ type: 'link', attrs: { href: r.href } });
                return { type: 'text', text: r.text, ...(marks!.length ? { marks: marks } : {}) };
              }),
            })),
          ],
        })),
      ],
    })),
  };
}
