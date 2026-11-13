/**
 * 粘贴归一化四项（m1.4，docs/01 §5.6）：
 * ① 选项气泡（保留格式=白名单清洗后/仅文本；Ctrl+Shift+V 恒仅文本）② 大段粘贴引导
 * ③ 表格平铺为文本行（不丢字）④ 清理规则（换行归一/空行折叠/图片忽略 toast/scheme 白名单）
 *
 * 本文件负责 DOM 解析与 Clipboard 读取；纯规则在 paste-format.ts。
 * 插入与气泡 UI 由 CanvasEditor 层消费 PastePlan（2026-11-04 尾项补齐）。
 *
 * 2026-11-13 反馈修复（用户报障：粘贴进来的段落点不进去、重开丢失）：
 * `flEntry` 的 schema 只收 `flBullet`，外部富文本的 `<p>` 落到 doc 根后
 * ① 不在「点文字」选择器里 → 点它被当成空白并追加新要点；② `pmToResumeDoc` 顶层只认
 * flSection/flColumn → 每次保存都把它丢掉。修法：**多块粘贴先逐块转成 `flBullet`**
 * （每块新 nanoid，避免同段复制两次出现重复 blockId）；单块粘贴仍走内联，保持「粘一句话」直觉。
 */
import type { EditorView } from '@tiptap/pm/view';
import { isLargePaste, normalizePlainText, plainTextToHtml, rowsToLines } from './paste-format.js';
import { nanoid } from '../../lib/nanoid.js';

export type PasteMode = 'html' | 'plain' | 'table';

export interface PastePayload {
  html: string;
  text: string;
}

export interface PastePlan {
  mode: PasteMode;
  /** 实际插入片段：html=原样（PM schema 白名单解析）；plain/table=<br> 连接的转义文本 */
  html: string;
  /** 归一化后的纯文本（大段判定/仅文本转换共用） */
  plainText: string;
  wasLargePaste: boolean;
  ignoredImageCount: number;
}

/**
 * 剪贴板 → 插入计划。
 * - plainOnly：忽略 HTML，按纯文本归一化后插入；
 * - 表格：全部行逐单元格平铺（不丢字），不再走 HTML 插入；
 * - 其余带 HTML：原样交 PM schema 白名单解析；纯文本回退用于大段判定与「仅文本」。
 */
export function buildPastePlan(payload: PastePayload, opts: { plainOnly?: boolean } = {}): PastePlan | null {
  const probe = payload.html ? document.createElement('div') : null;
  if (probe) probe.innerHTML = payload.html;

  const normalizedText = normalizePlainText(payload.text);
  const htmlText = normalizePlainText(probe?.textContent ?? '');
  const baseText = normalizedText || htmlText;
  const ignoredImageCount = probe ? probe.querySelectorAll('img').length : 0;

  if (opts.plainOnly) {
    if (!baseText) return null;
    const html = plainTextToHtml(baseText);
    return {
      mode: 'plain',
      html,
      plainText: baseText,
      wasLargePaste: isLargePaste(baseText),
      ignoredImageCount,
    };
  }

  if (probe) {
    const table = probe.querySelector('table');
    if (table) {
      const rows = Array.from(probe.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th,td')).map((cell) => cell.textContent ?? ''),
      );
      const lines = rowsToLines(rows);
      if (lines.length > 0) {
        const plainText = lines.join('\n');
        const html = plainTextToHtml(plainText);
        return {
          mode: 'table',
          html,
          plainText,
          wasLargePaste: isLargePaste(plainText),
          ignoredImageCount,
        };
      }
    }
    return {
      mode: 'html',
      html: payload.html,
      plainText: baseText,
      wasLargePaste: isLargePaste(baseText),
      ignoredImageCount,
    };
  }

  if (!baseText) return null;
  const html = plainTextToHtml(baseText);
  return {
    mode: 'plain',
    html,
    plainText: baseText,
    wasLargePaste: isLargePaste(baseText),
    ignoredImageCount,
  };
}

/** 插入结果区间（气泡定位与「仅文本」原地替换用；[from,to) 为插入后的文档位置） */
export interface PasteInsertion {
  from: number;
  to: number;
}

/** 块级标签：粘贴时这些会各自成为一条要点（浏览器复制的富文本必然包在这些里） */
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'PRE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'FIGURE', 'HEADER', 'FOOTER',
]);

/** 行内标签：遇到它们不该拆块 */
const INLINE_TAGS = new Set([
  'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'CODE', 'SUB', 'SUP', 'MARK', 'SMALL', 'BR', 'FONT', 'DEL', 'INS',
]);

export interface PastedBlocks {
  /** 顶层块内容（innerHTML，保留加粗/斜体/链接等白名单行内标记） */
  blocks: string[];
}

/**
 * 把待粘贴的 HTML 拆成「块」序列（纯 DOM 解析，不改内容）。
 * 只有真正的内容块才计入：嵌套在块里的 `<p>` 会被提升为独立块；
 * 纯行内内容（如 plain 模式的 `<br>` 连接片段）返回空数组 → 调用方走内联插入。
 */
export function splitPastedBlocks(html: string): PastedBlocks {
  const root = document.createElement('div');
  root.innerHTML = html;
  const blocks: string[] = [];

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName;
      if (INLINE_TAGS.has(tag)) {
        // 行内直接挂在根上：并入下一个块；单独出现则自成一串（在下面兜底处理）
        continue;
      }
      if (BLOCK_TAGS.has(tag)) {
        // 块内若还包着块（如 div > p），继续下钻，叶子块才算一块
        const hasBlockChild = Array.from(child.children).some((g) => BLOCK_TAGS.has(g.tagName));
        if (hasBlockChild) walk(child);
        else blocks.push(child.innerHTML);
        continue;
      }
      // 未知容器（table/ul/自定义标签）：继续下钻
      walk(child);
    }
  };

  walk(root);

  // 根上直接是行内内容（`<b>x</b>y` 这类）：整段当一个块，交给上层决定内联还是成条
  if (blocks.length === 0) {
    const inlineHtml = root.innerHTML.trim();
    if (inlineHtml) blocks.push(inlineHtml);
  }
  return { blocks };
}

/** 块序列 → 每块一条 `<li data-type="fl-bullet">`（新 blockId） */
export function blocksToBulletHtml(blocks: string[], newId: () => string = nanoid): string {
  return blocks
    .map((html) => `<li data-type="fl-bullet" data-block-id="${newId()}">${html}</li>`)
    .join('');
}

/** 光标是否处在某个名字的祖先节点内；返回 null = 视图没有位置信息（测试假 view） */
function insideNodeNamed(view: EditorView, names: string[]): boolean | null {
  const $from = (view.state.selection as { $from?: { depth: number; node: (d: number) => { type: { name: string } } } }).$from;
  if (!$from) return null;
  for (let d = $from.depth; d > 0; d -= 1) {
    if (names.includes($from.node(d).type.name)) return true;
  }
  return false;
}

function docHasEntry(view: EditorView): boolean {
  const doc = view.state.doc as { descendants?: (fn: (node: { type: { name: string } }) => boolean | void) => void };
  if (typeof doc.descendants !== 'function') return true; // 测试假 view：按“有条目”处理
  let found = false;
  doc.descendants((node) => {
    if (found) return false;
    if (node.type.name === 'flEntry') {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

/**
 * 统一的插入入口：事件粘贴 / 右键粘贴 / Ctrl+Shift+V 共用。
 * 返回实际插入区间 [from,to)；区间为空表示“没插入任何东西”（气泡与长文提示由调用方决定）。
 *
 * 2026-11-13：多块粘贴先转成 flBullet（每块新 blockId），
 * 单块且光标在要点内时保持内联（"粘一句话"不应拆行）；无条目时退化为内联，避免造出 schema 外节点。
 */
export function insertPastePlan(view: EditorView, plan: PastePlan): PasteInsertion {
  const { blocks } = splitPastedBlocks(plan.html);
  const inBullet = insideNodeNamed(view, ['flBullet']) !== false; // null（假 view）按要点内处理
  const hasEntry = docHasEntry(view);

  // 判定插入形态：≥2 块一律成条；单块仅在光标不在要点内时成条（否则内联）
  const asBullets = hasEntry && (blocks.length >= 2 || (blocks.length === 1 && !inBullet));
  const html = asBullets ? blocksToBulletHtml(blocks) : plan.html;

  const from = view.state.selection.from;
  view.pasteHTML(html);
  // 粘贴后 PM 把光标放在插入内容末尾；用它推导区间（兼容 ReplaceStep 与 ReplaceAroundStep）
  const to = view.state.selection.from;
  return to > from ? { from, to } : { from, to: from };
}

/** Tiptap editorProps.handlePaste 兼容签名（第三参 slice 由 PM 提供，本实现不消费） */
export function makePasteHandler(
  onResult: (result: PastePlan, insertion: PasteInsertion, view: EditorView) => void,
) {
  return (view: EditorView, event: ClipboardEvent): boolean => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;
    const plan = buildPastePlan({
      html: clipboardData.getData('text/html'),
      text: clipboardData.getData('text/plain'),
    });
    if (!plan) return false;
    event.preventDefault();
    const insertion = insertPastePlan(view, plan);
    onResult(plan, insertion, view);
    return true;
  };
}

/**
 * 读系统剪贴板（右键粘贴 / Ctrl+Shift+V 用）。
 * 优先 read() 取 html+text；权限或格式不可读时回退 readText()。
 */
export async function readClipboardPayload(): Promise<PastePayload> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const html = item.types.includes('text/html') ? await (await item.getType('text/html')).text() : '';
      const text = item.types.includes('text/plain') ? await (await item.getType('text/plain')).text() : '';
      if (html || text) return { html, text };
    }
  } catch {
    // 剪贴板权限/格式不可读：回退纯文本
  }
  const text = await navigator.clipboard.readText();
  return { html: '', text };
}
