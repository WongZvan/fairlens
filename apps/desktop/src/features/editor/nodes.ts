/**
 * FairLens 自定义节点体系（m1.3；2026-11-05 预览纸面结构扩展，#117）。
 * 契约源=packages/shared/src/resume.ts——引用前去读源，勿凭记忆。
 *
 * schema 封闭性（§5.2 权限矩阵）：仅注册三种 mark（bold/italic/link）与纸面结构节点；
 * 字体/字号/颜色等无 schema 表达——由 printCSS 模板令牌决定。
 */
import { Link } from '@tiptap/extension-link';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { MarkType, Node as PMDocNode } from '@tiptap/pm/model';
import type { ResumeDoc, Section } from '@fairlens/shared';
import { nanoid as nanoidGen } from '../../lib/nanoid.js';
import { hrefFromLinkMouseDown } from '../../lib/link-click.js';
import { isSafeHref } from './link-policy.js';
import { partitionSections, sortSectionsByOrder } from './paper-model.js';
import { PageHeaderView } from './nodeviews/PageHeaderView.js';
import { EntryHeaderView } from './nodeviews/EntryHeaderView.js';
import { BasicFieldView } from './nodeviews/BasicFieldView.js';
import { SkillGroupView } from './nodeviews/SkillGroupView.js';
import { PhotoSlotView } from './nodeviews/PhotoSlotView.js';

const nanoid12 = () => nanoidGen(12);

export const BLOCK_ID = 'data-block-id' as const;

function blockIdAttr() {
  return {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute(BLOCK_ID),
    renderHTML: (attrs: Record<string, unknown>) => (attrs.id ? { [BLOCK_ID]: attrs.id } : {}),
  };
}

/** 分区：五类之一；标题可编辑；子节点按 type 过滤（entry/field/photo/skillGroup） */
export const SectionNode = Node.create({
  name: 'flSection',
  group: 'block',
  content: 'flSectionHeader (flEntry | flBasicField | flPhotoSlot | flSkillGroup)*',
  defining: true,
  addAttributes() {
    return {
      id: blockIdAttr(),
      type: { default: 'basic' },
      title: { default: '' },
      /** 内部排序键（不写入 ResumeDoc；duo 分组后还原原始分区顺序） */
      order: { default: null as number | null },
    };
  },
  parseHTML() {
    return [
      {
        tag: `section[data-type="fl-section"]`,
        getAttrs: (el: HTMLElement) => ({
          type: el.getAttribute('data-section-type') ?? 'basic',
          order: el.getAttribute('data-order') ? Number(el.getAttribute('data-order')) : null,
          title: el.getAttribute('data-title') ?? '',
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const { id, type, title, order } = node.attrs;
    return [
      'section',
      {
        'data-type': 'fl-section',
        'data-section-type': String(type),
        class: 'fl-section',
        ...(id ? { [BLOCK_ID]: String(id) } : {}),
        ...(typeof order === 'number' ? { 'data-order': String(order) } : {}),
        ...(title ? { 'data-title': String(title) } : {}),
      },
      0,
    ];
  },
});

/** 分区标题（可编辑，排版归模板） */
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

/** 页头（#117）：profile ↔ attrs；NodeView 展示 + 元信息编辑 */
export const PageHeaderNode = Node.create({
  name: 'flPageHeader',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,
  addAttributes() {
    return {
      name: { default: '' },
      headline: { default: null as string | null },
      contactLine: { default: null as string | null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'header[data-type="fl-page-header"]',
        getAttrs: (el: HTMLElement) => ({
          name: el.getAttribute('data-name') ?? '',
          headline: el.getAttribute('data-headline'),
          contactLine: el.getAttribute('data-contact'),
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const { name, headline, contactLine } = node.attrs;
    return [
      'header',
      {
        'data-type': 'fl-page-header',
        'data-name': String(name ?? ''),
        ...(headline ? { 'data-headline': String(headline) } : {}),
        ...(contactLine ? { 'data-contact': String(contactLine) } : {}),
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageHeaderView);
  },
});

/** 基本信息字段（#117）：value=inline content，label/href=attrs */
export const BasicFieldNode = Node.create({
  name: 'flBasicField',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      id: blockIdAttr(),
      label: { default: '' },
      href: { default: null as string | null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'p[data-type="fl-basic-field"]',
        getAttrs: (el: HTMLElement) => ({
          label: el.getAttribute('data-label') ?? '',
          href: el.getAttribute('data-href'),
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const { id, label, href } = node.attrs;
    return [
      'p',
      {
        'data-type': 'fl-basic-field',
        ...(id ? { [BLOCK_ID]: String(id) } : {}),
        'data-label': String(label ?? ''),
        ...(href ? { 'data-href': String(href) } : {}),
      },
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(BasicFieldView);
  },
});

/** 照片槽（#117）：atom；占位节点不写入契约（真实上传随 m5.1） */
export const PhotoSlotNode = Node.create({
  name: 'flPhotoSlot',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,
  addAttributes() {
    return {
      id: blockIdAttr(),
      mime: { default: null as string | null },
      blobRef: { default: null as string | null },
      w: { default: null as number | null },
      h: { default: null as number | null },
      placeholder: { default: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="fl-photo-slot"]',
        getAttrs: (el: HTMLElement) => ({
          mime: el.getAttribute('data-mime'),
          blobRef: el.getAttribute('data-blob-ref'),
          w: el.getAttribute('data-w') ? Number(el.getAttribute('data-w')) : null,
          h: el.getAttribute('data-h') ? Number(el.getAttribute('data-h')) : null,
          placeholder: el.getAttribute('data-placeholder') === 'true',
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const { id, mime, blobRef, w, h, placeholder } = node.attrs;
    return [
      'div',
      {
        'data-type': 'fl-photo-slot',
        ...(id ? { [BLOCK_ID]: String(id) } : {}),
        ...(mime ? { 'data-mime': String(mime) } : {}),
        ...(blobRef ? { 'data-blob-ref': String(blobRef) } : {}),
        ...(typeof w === 'number' ? { 'data-w': String(w) } : {}),
        ...(typeof h === 'number' ? { 'data-h': String(h) } : {}),
        ...(placeholder ? { 'data-placeholder': 'true' } : {}),
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PhotoSlotView);
  },
});

/** 技能组（#117）：name=attrs，items=inline 内容（hardBreak 分条） */
export const SkillGroupNode = Node.create({
  name: 'flSkillGroup',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes() {
    return {
      id: blockIdAttr(),
      name: { default: '' },
    };
  },
  addKeyboardShortcuts() {
    const insertItemBreak = () => {
      if (this.editor.view.composing) return false;
      if (!this.editor.isActive('flSkillGroup')) return false;
      return this.editor.commands.insertContent({ type: 'hardBreak' });
    };
    return { Enter: insertItemBreak, 'Shift-Enter': insertItemBreak };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="fl-skill-group"]',
        getAttrs: (el: HTMLElement) => ({ name: el.getAttribute('data-name') ?? '' }),
      },
    ];
  },
  renderHTML({ node }) {
    const { id, name } = node.attrs;
    return [
      'div',
      {
        'data-type': 'fl-skill-group',
        ...(id ? { [BLOCK_ID]: String(id) } : {}),
        'data-name': String(name ?? ''),
      },
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SkillGroupView);
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
    return [
      {
        tag: 'article[data-type="fl-entry"]',
        getAttrs: (el: HTMLElement) => ({
          org: el.getAttribute('data-org') ?? '',
          role: el.getAttribute('data-role'),
          start: el.getAttribute('data-start'),
          end: el.getAttribute('data-end'),
          ongoing: el.getAttribute('data-ongoing') === 'true' ? true : null,
          pageBreakBefore: el.getAttribute('data-page-break-before') === 'true' ? true : null,
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const { id, org, role, start, end, ongoing, pageBreakBefore } = node.attrs;
    return [
      'article',
      {
        'data-type': 'fl-entry',
        class: 'fl-entry',
        ...(id ? { [BLOCK_ID]: String(id) } : {}),
        'data-org': String(org ?? ''),
        ...(role ? { 'data-role': String(role) } : {}),
        ...(start ? { 'data-start': String(start) } : {}),
        ...(end ? { 'data-end': String(end) } : {}),
        ...(ongoing ? { 'data-ongoing': 'true' } : {}),
        ...(pageBreakBefore ? { 'data-page-break-before': 'true' } : {}),
      },
      0,
    ];
  },
});

/** 条目头（#117）：atom，org/role/date 三段由 attrs 驱动；序列化直接读 attrs */
export const EntryHeaderNode = Node.create({
  name: 'flEntryHeader',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,
  addAttributes() {
    return {
      id: blockIdAttr(),
      org: { default: '' },
      role: { default: null as string | null },
      start: { default: null as string | null },
      end: { default: null as string | null },
      ongoing: { default: null as boolean | null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'header[data-type="fl-entry-header"]',
        getAttrs: (el: HTMLElement) => ({
          org: el.getAttribute('data-org') ?? '',
          role: el.getAttribute('data-role'),
          start: el.getAttribute('data-start'),
          end: el.getAttribute('data-end'),
          ongoing: el.getAttribute('data-ongoing') === 'true' ? true : null,
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const { id, org, role, start, end, ongoing } = node.attrs;
    return [
      'header',
      {
        'data-type': 'fl-entry-header',
        ...(id ? { [BLOCK_ID]: String(id) } : {}),
        'data-org': String(org ?? ''),
        ...(role ? { 'data-role': String(role) } : {}),
        ...(start ? { 'data-start': String(start) } : {}),
        ...(end ? { 'data-end': String(end) } : {}),
        ...(ongoing ? { 'data-ongoing': 'true' } : {}),
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EntryHeaderView);
  },
});

/** duo 专用列容器（#117）：side=basic/skill，main=education/experience/project */
export const ColumnNode = Node.create({
  name: 'flColumn',
  group: 'block',
  content: 'flSection+',
  defining: true,
  addAttributes() {
    return { kind: { default: 'main' } };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="fl-column"]',
        getAttrs: (el: HTMLElement) => ({ kind: el.getAttribute('data-kind') === 'side' ? 'side' : 'main' }),
      },
    ];
  },
  renderHTML({ node }) {
    const kind = node.attrs.kind === 'side' ? 'side' : 'main';
    return ['div', { 'data-type': 'fl-column', 'data-kind': kind, class: kind === 'side' ? 'fl-side' : 'fl-main' }, 0];
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
  addKeyboardShortcuts() {
    // Enter：当前 bullet 内新起一条 bullet（同 entry 语义）；Shift+Enter：同 bullet 软换行
    return {
      Enter: () => {
        // IME 合成态：Enter 属于输入法候选确认，不拆要点（m1.4 尾项）
        if (this.editor.view.composing) return false;
        if (!this.editor.isActive('flBullet')) return false;
        // #113（用户拍板：空行不属于内容）：空要点上按 Enter → 删除该行，光标落到上一要点末尾
        const { state } = this.editor;
        const { $from } = state.selection;
        for (let d = $from.depth; d > 0; d -= 1) {
          const node = $from.node(d);
          if (node.type.name !== 'flBullet') continue;
          if (node.textContent.trim().length > 0) break;
          // 保留至少一条要点（否则 entry 无法继续输入）
          const entry = d > 1 ? $from.node(d - 1) : null;
          let bulletCount = 1;
          if (entry) {
            bulletCount = 0;
            entry.forEach((child) => {
              if (child.type.name === 'flBullet') bulletCount += 1;
            });
          }
          if (bulletCount <= 1) break;
          const from = $from.before(d);
          const to = $from.after(d);
          const tr = state.tr.delete(from, to);
          tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(1, from - 1)), -1));
          this.editor.view.dispatch(tr);
          return true;
        }
        return this.editor.chain().focus().splitBlock({ keepMarks: false }).updateAttributes('flBullet', { id: nanoid12() }).run();
      },
      'Shift-Enter': () => {
        if (this.editor.view.composing) return false;
        return this.editor.commands.insertContent({ type: 'hardBreak' });
      },
    };
  },
  parseHTML() {
    return [{ tag: 'li[data-type="fl-bullet"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'fl-bullet' }), 0];
  },
});

/** 软换行（Shift+Enter 产物；§5.2 权限矩阵补注：属于内容结构，非格式控制） */
export const HardBreakNode = Node.create({
  name: 'hardBreak',
  group: 'inline',
  inline: true,
  selectable: false,
  parseHTML() {
    return [{ tag: 'br' }];
  },
  renderHTML() {
    return ['br'];
  },
});

/** 文档根级配置：templateId/style 走 ResumeDoc 层（非节点 attrs，序列化时合并） */
export const DocMeta = Extension.create({
  name: 'flDocMeta',
  addOptions() {
    return { templateId: 'tpl-classic' };
  },
});

/** mark：三种之外不存在；编辑态点击不跳转，Ctrl/Meta+点击经系统浏览器开（§5.2） */
export const linkMark = Link.configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: false,
  // 注入面在 schema 层强制（§9）：仅 http/https/mailto。库默认放行 ftp/tel/sms 等，必须收窄。
  isAllowedUri: (url, { defaultValidate }) => isSafeHref(url) && defaultValidate(url),
  shouldAutoLink: (url) => isSafeHref(url),
});

/** 右键菜单转发（#93）：PM 默认吞 contextmenu 的 stopPropagation → React onContextMenu 收不到。
 *  插件层 handleDOMEvents.contextmenu 转发给冒出（调用方经 window 自定义事件接收）。 */
export const contextMenuForward = Extension.create({
  name: 'flContextMenuForward',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('flContextMenu'),
        props: {
          handleDOMEvents: {
            contextmenu: (_view, event) => {
              // PM 不拦 contextmenu：透传（return false）让原生冒泡到 React onContextMenu。
              // 之前"二次 dispatch"版造成死循环（探针实测 42 次/16ms）——勿恢复
              void _view; void event;
              return false;
            },
          },
        },
      }),
    ];
  },
});

/** Ctrl/Meta+点击链接 → openExternal（#111：改挂 mousedown——PM 的 handleClick 依赖内部鼠标序列，实测不触发） */
export const linkClickPlugin = Extension.create({
  name: 'flLinkClick',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('flLinkClickTop'),
        props: {
          handleDOMEvents: {
            mousedown: (_view, raw) => {
              const e = raw as MouseEvent;
              const href = hrefFromLinkMouseDown(e);
              if (!href) return false;
              e.preventDefault(); // 阻止光标落入链接文本
              void import('../../lib/open-external.js').then((m) => m.openExternal(href));
              return true;
            },
          },
        },
      }),
    ];
  },
});

/**
 * #113：收集链接文本节点中"首/尾空白"的区间（PM 会把空白与相邻文字合并成一个节点，
 * 所以不能只判"整节点纯空白"）。规则：剥掉链接文字首尾的空白标记，正文内部空格仍属链接。
 */
export function collectWhitespaceLinkRanges(doc: PMDocNode, linkType: MarkType): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    if (!linkType.isInSet(node.marks)) return;
    const text = node.text;
    const lead = text.length - text.replace(/^\s+/, '').length;
    const trail = text.length - text.replace(/\s+$/, '').length;
    if (lead === text.length) {
      ranges.push({ from: pos, to: pos + text.length }); // 整段纯空白
      return;
    }
    if (lead > 0) ranges.push({ from: pos, to: pos + lead });
    if (trail > 0) ranges.push({ from: pos + text.length - trail, to: pos + text.length });
  });
  return ranges;
}

/** #113：纯空白文本自动脱链——Tiptap Link 的 inclusive 跟随 autolink，空格会被并入链接导致下划线延长 */
export const linkWhitespaceGuard = Extension.create({
  name: 'flLinkWhitespaceGuard',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('flLinkWhitespaceGuard'),
        appendTransaction: (trs, _old, state) => {
          if (!trs.some((t) => t.docChanged)) return null;
          const linkType = state.schema.marks.link;
          if (!linkType) return null;
          const ranges = collectWhitespaceLinkRanges(state.doc, linkType);
          if (ranges.length === 0) return null;
          const tr = state.tr;
          for (const r of ranges) tr.removeMark(r.from, r.to, linkType);
          return tr;
        },
      }),
    ];
  },
});

export const flExtensions = [
  contextMenuForward,
  linkClickPlugin,
  linkWhitespaceGuard,
  HardBreakNode,
  PageHeaderNode,
  SectionNode,
  SectionHeaderNode,
  BasicFieldNode,
  PhotoSlotNode,
  SkillGroupNode,
  ColumnNode,
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
    if (c.type === 'hardBreak') return [{ text: '\n' }];
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

/** 保留 hardBreak 为 \n（basic field / skill items 用） */
function textWithBreaks(pm: PMNode | undefined): string {
  return (pm?.content ?? []).map((c) => (c.type === 'hardBreak' ? '\n' : (c.text ?? ''))).join('');
}

function skillItemsOf(pm: PMNode): string[] {
  return textWithBreaks(pm)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function profileOf(header: PMNode | undefined): ResumeDoc['profile'] | undefined {
  if (!header) return undefined;
  const name = String(header.attrs?.name ?? '').trim();
  if (!name) return undefined;
  const headline = String(header.attrs?.headline ?? '').trim();
  const contactLine = String(header.attrs?.contactLine ?? '').trim();
  return { name, ...(headline ? { headline } : {}), ...(contactLine ? { contactLine } : {}) };
}

function fieldOf(field: PMNode): NonNullable<Section['basicFields']>[number] {
  const label = String(field.attrs?.label ?? '').trim() || '字段';
  const value = textWithBreaks(field);
  const href =
    typeof field.attrs?.href === 'string' && isSafeHref(field.attrs.href) ? field.attrs.href : undefined;
  return {
    id: String(field.attrs?.id ?? '') || nanoid12(),
    label,
    value,
    ...(href ? { href } : {}),
  };
}

function photoOf(slot: PMNode): NonNullable<Section['photo']> | undefined {
  if (slot.type !== 'flPhotoSlot' || slot.attrs?.placeholder === true) return undefined;
  const mime = slot.attrs?.mime;
  if (mime !== 'image/jpeg' && mime !== 'image/png') return undefined;
  const blobRef = String(slot.attrs?.blobRef ?? '');
  const w = Number(slot.attrs?.w);
  const h = Number(slot.attrs?.h);
  if (!blobRef || !Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) return undefined;
  return { id: String(slot.attrs?.id ?? '') || nanoid12(), mime, blobRef, w, h };
}

function skillOf(group: PMNode): NonNullable<Section['skills']>[number] {
  return {
    id: String(group.attrs?.id ?? '') || nanoid12(),
    name: String(group.attrs?.name ?? '').trim() || '技能',
    items: skillItemsOf(group),
  };
}

function entryOf(entry: PMNode): Section['entries'][number] {
  const header = (entry.content ?? []).find((n) => n.type === 'flEntryHeader');
  const attrs = { ...(entry.attrs ?? {}), ...(header?.attrs ?? {}) };
  const out: Record<string, unknown> = {
    id: String(attrs.id ?? '') || nanoid12(),
    org: String(attrs.org ?? ''),
    // 契约 Bullet.runs min(1)：删空文本的 bullet（PM 空段）不序列化——曾流入大纲/快照造成"空壳条目"（m1.6 反馈）
    bullets: (entry.content ?? [])
      .filter((n): n is PMNode & { type: 'flBullet' } => n.type === 'flBullet')
      .map((b) => ({ id: String(b.attrs?.id ?? '') || nanoid12(), runs: runsOf(b) }))
      .filter((b) => b.runs.length > 0),
  };
  for (const k of ['role', 'start', 'end', 'ongoing', 'pageBreakBefore'] as const) {
    const v = attrs[k];
    if (v !== null && v !== undefined) out[k] = v; // 契约为 absent≠undefined：仅写实际存在字段
  }
  return out as unknown as Section['entries'][number];
}

function sectionOf(section: PMNode): Section {
  const children = section.content ?? [];
  const header = children.find((n) => n.type === 'flSectionHeader');
  const type = (section.attrs?.type as Section['type']) ?? 'basic';
  const basicFields = children
    .filter((n): n is PMNode & { type: 'flBasicField' } => n.type === 'flBasicField')
    .map(fieldOf);
  const skills = children
    .filter((n): n is PMNode & { type: 'flSkillGroup' } => n.type === 'flSkillGroup')
    .map(skillOf);
  const photo = children.map(photoOf).find(Boolean);
  return {
    id: String(section.attrs?.id ?? ''),
    type,
    title: textOf(header) || String(section.attrs?.title ?? ''),
    entries: children
      .filter((n): n is PMNode & { type: 'flEntry' } => n.type === 'flEntry')
      .map(entryOf),
    ...(basicFields.length ? { basicFields } : {}),
    ...(photo ? { photo } : {}),
    ...(skills.length ? { skills } : {}),
  };
}

/** PM 文档 → ResumeDoc（templateId/style 由调用方传入——DocMeta 不进节点树，序列化层合并） */
export function pmToResumeDoc(doc: PMNode, meta?: { templateId: string; style?: ResumeDoc['style'] }): ResumeDoc {
  const top = doc.content ?? [];
  const profile = profileOf(top.find((n) => n.type === 'flPageHeader'));

  const sectionNodes: PMNode[] = [];
  for (const node of top) {
    if (node.type === 'flSection') sectionNodes.push(node);
    if (node.type === 'flColumn') {
      for (const child of node.content ?? []) {
        if (child.type === 'flSection') sectionNodes.push(child);
      }
    }
  }
  const ordered = sortSectionsByOrder(
    sectionNodes.map((node) => ({
      node,
      order: typeof node.attrs?.order === 'number' ? node.attrs.order : null,
    })),
  ).map((x) => x.node);

  return {
    templateId: meta?.templateId ?? 'tpl-classic',
    ...(meta?.style ? { style: meta.style } : {}),
    ...(profile ? { profile } : {}),
    sections: ordered.map(sectionOf),
  };
}

/** ResumeDoc → PM 文档 JSON（编辑器初始内容；duo 默认分组为 side/main 两列） */
export function resumeDocToPm(doc: ResumeDoc): PMNode {
  const indexOf = new Map(doc.sections.map((section, index) => [section.id, index]));

  const sectionPm = (section: Section): PMNode => {
    const children: PMNode[] = [
      {
        type: 'flSectionHeader',
        attrs: { id: section.id },
        ...(section.title ? { content: [{ type: 'text', text: section.title }] } : {}),
      },
    ];

    for (const field of section.basicFields ?? []) {
      children.push({
        type: 'flBasicField',
        attrs: { id: field.id, label: field.label, href: field.href ?? null },
        ...(field.value ? { content: [{ type: 'text', text: field.value }] } : {}),
      });
    }

    if (section.photo) {
      children.push({
        type: 'flPhotoSlot',
        attrs: {
          id: section.photo.id,
          mime: section.photo.mime,
          blobRef: section.photo.blobRef,
          w: section.photo.w,
          h: section.photo.h,
          placeholder: false,
        },
      });
    } else if (doc.templateId === 'tpl-duo' && section.type === 'basic') {
      // 预览默认照片槽：仅 basic 分区占位，不写入 ResumeDoc（真实上传随 m5.1）
      children.push({
        type: 'flPhotoSlot',
        attrs: { id: nanoid12(), mime: null, blobRef: null, w: null, h: null, placeholder: true },
      });
    }

    for (const entry of section.entries) {
      const bullets: PMNode[] = entry.bullets.map((b) => ({
        type: 'flBullet',
        attrs: { id: b.id },
        content: b.runs.flatMap((r) =>
          r.text.split('\n').flatMap((seg, i) => {
            const parts: PMNode[] = [];
            if (i > 0) parts.push({ type: 'hardBreak' });
            if (seg.length === 0) return parts;
            const marks: PMNode['marks'] = [];
            if (r.bold) marks!.push({ type: 'bold' });
            if (r.italic) marks!.push({ type: 'italic' });
            if (r.href) marks!.push({ type: 'link', attrs: { href: r.href } });
            parts.push({ type: 'text', text: seg, ...(marks!.length ? { marks } : {}) });
            return parts;
          }),
        ),
      }));
      children.push({
        type: 'flEntry',
        attrs: {
          id: entry.id,
          org: entry.org,
          role: entry.role ?? null,
          start: entry.start ?? null,
          end: entry.end ?? null,
          ongoing: entry.ongoing ?? null,
          pageBreakBefore: entry.pageBreakBefore ?? null,
        },
        content: [
          {
            type: 'flEntryHeader',
            attrs: {
              id: entry.id,
              org: entry.org,
              role: entry.role ?? null,
              start: entry.start ?? null,
              end: entry.end ?? null,
              ongoing: entry.ongoing ?? null,
            },
          },
          ...bullets,
        ],
      });
    }

    for (const group of section.skills ?? []) {
      const content: PMNode[] = [];
      group.items.forEach((item, index) => {
        if (index > 0) content.push({ type: 'hardBreak' });
        if (item) content.push({ type: 'text', text: item });
      });
      children.push({
        type: 'flSkillGroup',
        attrs: { id: group.id, name: group.name },
        ...(content.length ? { content } : {}),
      });
    }

    return {
      type: 'flSection',
      attrs: {
        id: section.id,
        type: section.type,
        title: section.title,
        order: indexOf.get(section.id) ?? 0,
      },
      content: children,
    };
  };

  // 页头始终存在：旧文档无 profile 时给空白可编辑占位（不伪造数据；填了名字才写入 profile）
  const header: PMNode[] = [
    {
      type: 'flPageHeader',
      attrs: {
        name: doc.profile?.name ?? '',
        headline: doc.profile?.headline ?? null,
        contactLine: doc.profile?.contactLine ?? null,
      },
    },
  ];

  if (doc.templateId === 'tpl-duo') {
    const { side, main } = partitionSections(doc.sections);
    const content: PMNode[] = [...header];
    if (side.length) content.push({ type: 'flColumn', attrs: { kind: 'side' }, content: side.map(sectionPm) });
    if (main.length) content.push({ type: 'flColumn', attrs: { kind: 'main' }, content: main.map(sectionPm) });
    return { type: 'doc', content };
  }

  return { type: 'doc', content: [...header, ...doc.sections.map(sectionPm)] };
}
