/**
 * 粘贴归一化四项（v1.6，docs/01 §5.6）：
 * ① 选项气泡（保留格式=白名单清洗后/仅文本；Ctrl+Shift+V 恒仅文本）② 大段粘贴引导导入
 * ③ 表格平铺为文本行（不丢字）④ 清理规则（换行归一/空行折叠/图片忽略 toast/scheme 白名单）
 * 气泡 UI 由 CanvasEditor 层渲染（PasteBubble 事件），本 hook 只产出处理后的 PM 片段。
 */
import type { Node as PMNode, Slice } from '@tiptap/pm/model';
import { PluginKey } from '@tiptap/pm/state';

export const LARGE_PASTE_CHARS = 300;

export interface PasteNormalizationResult {
  handled: boolean;
  wasLargePaste: boolean;
  ignoredImageCount: number;
}

/** 白名单清洗：schema 之外的 marks/节点在 PM 解析时天然丢弃——这里做文本级清理 */
export function normalizePlainText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n') // ④ 换行归一
    .replace(/\n{3,}/g, '\n\n') // 空行折叠
    .trim();
}

/** 表格（HTML）→ 逐单元格文本行（③ 不丢字） */
export function tableToLines(el: HTMLElement): string[] | null {
  const rows = el.querySelectorAll('tr');
  if (rows.length === 0) return null;
  const lines: string[] = [];
  rows.forEach((tr) => {
    const cells = [...tr.querySelectorAll('th,td')].map((c) => (c.textContent ?? '').trim()).filter(Boolean);
    if (cells.length) lines.push(cells.join('　'));
  });
  return lines.length ? lines : null;
}

/** scheme 白名单（§5.2：http/https/mailto） */
export function isSafeHref(href: string): boolean {
  return /^https?:/i.test(href) || /^mailto:/i.test(href);
}

/** 计数内嵌图片（④ toast 提示用） */
export function countImages(node: PMNode): number {
  let n = 0;
  node.descendants((child) => {
    if (child.type.name === 'image') n += 1;
    return true;
  });
  return n;
}

export function makePasteHandler(onResult: (r: PasteNormalizationResult) => void) {
  return (view: unknown, event: ClipboardEvent): boolean => {
    const e = event as ClipboardEvent & { __plainOnly?: boolean };
    const clipboardData = e.clipboardData;
    if (!clipboardData) return false;

    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');
    const plainOnly = e.__plainOnly === true || (html === '' && text !== '');

    // ② 大段检测（>300 字符或多段落）→ 交上层弹导入引导，默认放行原样粘贴
    const normalized = normalizePlainText(text);
    const large = normalized.length > LARGE_PASTE_CHARS || (normalized.split(/\n\n+/).length > 1 && normalized.length > 120);
    // ③ 表格平铺（HTML 含 <table> 且非仅文本模式）
    if (!plainOnly && html) {
      const probe = document.createElement('div');
      probe.innerHTML = html;
      const table = probe.querySelector('table');
      if (table) {
        const lines = tableToLines(probe);
        if (lines) {
          const pmText = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('');
          (view as { pasteHTML?: (h: string) => void }).pasteHTML?.(pmText);
          onResult({ handled: true, wasLargePaste: large, ignoredImageCount: 0 });
          return true;
        }
      }
    }

    // ④ 图片忽略计数（HTML 含 <img>）
    let imgCount = 0;
    if (html) {
      const probe = document.createElement('div');
      probe.innerHTML = html;
      imgCount = probe.querySelectorAll('img').length;
    }

    // ① 仅文本模式：全走 normalizePlainText；保留格式模式：交 PM schema 白名单解析（清洗隐式完成）
    if (plainOnly) {
      const normalized = normalizePlainText(text);
      if (normalized) {
        const pmText = normalized.split('\n').map((l) => `<p>${escapeHtml(l)}</p>`).join('');
        (view as { pasteHTML?: (h: string) => void }).pasteHTML?.(pmText);
      }
      onResult({ handled: true, wasLargePaste: large, ignoredImageCount: imgCount });
      return true;
    }

    onResult({ handled: false, wasLargePaste: large, ignoredImageCount: imgCount });
    return false; // 默认：PM schema 白名单清洗后插入
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** React 侧封装：返回 editorProps.handlePaste 兼容签名 + 结果回调（第三参 slice 按协议保留但不消费） */
export function usePasteNormalization(onResult?: (r: PasteNormalizationResult) => void) {
  const report = onResult ?? (() => {});
  return (view: unknown, event: ClipboardEvent, _slice: Slice) => makePasteHandler(report)(view, event);
}

export const pastePluginKey = new PluginKey('flPaste');
