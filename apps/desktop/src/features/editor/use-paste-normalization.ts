/**
 * 粘贴归一化四项（m1.4，docs/01 §5.6）：
 * ① 选项气泡（保留格式=白名单清洗后/仅文本；Ctrl+Shift+V 恒仅文本）② 大段粘贴引导
 * ③ 表格平铺为文本行（不丢字）④ 清理规则（换行归一/空行折叠/图片忽略 toast/scheme 白名单）
 *
 * 本文件负责 DOM 解析与 Clipboard 读取；纯规则在 paste-format.ts。
 * 插入与气泡 UI 由 CanvasEditor 层消费 PastePlan（2026-11-04 尾项补齐）。
 */
import type { EditorView } from '@tiptap/pm/view';
import type { Transaction } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { isLargePaste, normalizePlainText, plainTextToHtml, rowsToLines } from './paste-format.js';

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

/** 统一的插入入口：事件粘贴 / 右键粘贴 / Ctrl+Shift+V 共用 */
export function insertPastePlan(view: EditorView, plan: PastePlan): PasteInsertion {
  let insertion: PasteInsertion | null = null;
  // pasteHTML 内部 dispatch 同步执行：临时截获事务，取 ReplaceStep 的精确插入区间。
  // 不用「前后 content.size 差值」——mark 边界/替换选区时容易算偏，导致「仅文本」替换错位。
  const originalDispatch = view.dispatch;
  const capture = (tr: Transaction) => {
    for (const step of tr.steps) {
      if (step instanceof ReplaceStep && step.slice.size > 0) {
        insertion = { from: step.from, to: step.from + step.slice.size };
        break;
      }
    }
    originalDispatch.call(view, tr);
  };
  view.dispatch = capture as typeof view.dispatch;
  try {
    view.pasteHTML(plan.html);
  } finally {
    view.dispatch = originalDispatch;
  }
  if (insertion) return insertion;
  const from = view.state.selection.from;
  return { from, to: from };
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
