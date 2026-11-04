// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@tiptap/pm/view';
import { buildPastePlan, makePasteHandler } from './use-paste-normalization.js';

const fakeView = () => {
  const pasteHTML = vi.fn();
  return {
    pasteHTML,
    // insertPastePlan 只读 doc.size 与 selection；假 view 插入后尺寸不变 → 区间为 [1,1]
    state: { doc: { content: { size: 10 } }, selection: { from: 1, to: 1 } },
  } as unknown as EditorView;
};

const pasteEvent = (html: string, text: string) =>
  ({
    clipboardData: {
      getData: (type: string) => (type === 'text/html' ? html : type === 'text/plain' ? text : ''),
    },
    preventDefault: vi.fn(),
  }) as unknown as ClipboardEvent;

describe('粘贴归一化规则（DOM 路径）', () => {
  it('表格 HTML → 逐单元格平铺，不丢字', () => {
    const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
    const plan = buildPastePlan({ html, text: 'A\tB\nC\tD' });
    expect(plan?.mode).toBe('table');
    expect(plan?.plainText).toBe('A　B\nC　D');
    expect(plan?.html).toBe('A　B<br>C　D');
  });

  it('仅文本模式：忽略 HTML，按纯文本插入', () => {
    const plan = buildPastePlan({ html: '<b>粗体</b>', text: '粗体' }, { plainOnly: true });
    expect(plan?.mode).toBe('plain');
    expect(plan?.html).toBe('粗体');
  });

  it('图片计数（schema 不收图片，插入后 toast 提示）', () => {
    const plan = buildPastePlan({ html: '<p>hi</p><img src="x.png">', text: 'hi' });
    expect(plan?.mode).toBe('html');
    expect(plan?.ignoredImageCount).toBe(1);
  });

  it('HTML 有内容但纯文本为空：从 HTML 文本回退生成可转纯文本片段', () => {
    const plan = buildPastePlan({ html: '<p>Hello</p>', text: '' });
    expect(plan?.plainText).toBe('Hello');
  });

  it('大段判定', () => {
    expect(buildPastePlan({ html: '', text: 'a'.repeat(301) })?.wasLargePaste).toBe(true);
    expect(buildPastePlan({ html: '', text: 'a'.repeat(300) })?.wasLargePaste).toBe(false);
  });

  it('空剪贴板：不处理（返回 null / handler false）', () => {
    expect(buildPastePlan({ html: '', text: '' })).toBeNull();
    const view = fakeView();
    const handler = makePasteHandler(() => {});
    expect(handler(view, pasteEvent('', ''))).toBe(false);
  });

  it('handler 插入后回调结果，并阻止默认粘贴', () => {
    const view = fakeView();
    const results: unknown[] = [];
    const event = pasteEvent('<p>hi</p>', 'hi');
    const handled = makePasteHandler((r) => results.push(r))(view, event);
    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(view.pasteHTML).toHaveBeenCalledWith('<p>hi</p>');
    expect(results).toHaveLength(1);
  });
});
