// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@tiptap/pm/view';
import {
  blocksToBulletHtml,
  buildPastePlan,
  insertPastePlan,
  makePasteHandler,
  splitPastedBlocks,
} from './use-paste-normalization.js';

interface FakeView extends EditorView {
  pasteHTML: ReturnType<typeof vi.fn>;
}

const fakeView = (): FakeView => {
  const pasteHTML = vi.fn();
  return {
    pasteHTML,
    // insertPastePlan 读 selection.from 推导区间；假 view 插入后 selection 不变 → 区间为空
    state: { doc: { content: { size: 10 } }, selection: { from: 1, to: 1 } },
  } as unknown as FakeView;
};

/** 取第 n 次 pasteHTML 收到的 HTML */
const insertedHtml = (view: FakeView, n = 0): string => view.pasteHTML.mock.calls[n]![0] as string;

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
});

describe('粘贴块拆分（2026-11-13 反馈修复：裸段落点不进去/重开丢失）', () => {
  it('多个 <p> → 逐块（保序）', () => {
    expect(splitPastedBlocks('<p>第一段</p><p>第二段</p>').blocks).toEqual(['第一段', '第二段']);
  });

  it('div > p 下钻到叶子块，不把容器当一块', () => {
    expect(splitPastedBlocks('<div><p>甲</p><p>乙</p></div>').blocks).toEqual(['甲', '乙']);
  });

  it('列表项 → 逐条', () => {
    expect(splitPastedBlocks('<ul><li>一</li><li>二</li></ul>').blocks).toEqual(['一', '二']);
  });

  it('行内标记保留在块内容里（加粗/斜体/链接）', () => {
    const { blocks } = splitPastedBlocks('<p>普通 <b>粗</b> <a href="https://x.y">链</a></p>');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('<b>粗</b>');
    expect(blocks[0]).toContain('href="https://x.y"');
  });

  it('纯行内内容（plain 模式 <br> 串）→ 单块', () => {
    expect(splitPastedBlocks('第一行<br>第二行').blocks).toEqual(['第一行<br>第二行']);
  });

  it('标题标签（h1–h6）计入块', () => {
    expect(splitPastedBlocks('<h2>标题</h2><p>正文</p>').blocks).toEqual(['标题', '正文']);
  });

  it('空 HTML → 空块数组', () => {
    expect(splitPastedBlocks('').blocks).toEqual([]);
  });

  it('块 → <li data-type="fl-bullet">，每块一个新 blockId 且互不相同', () => {
    const html = blocksToBulletHtml(['甲', '乙'], (() => {
      let n = 0;
      return () => `Bul00000000${n++}`;
    })());
    expect(html).toBe(
      '<li data-type="fl-bullet" data-block-id="Bul000000000">甲</li>' +
        '<li data-type="fl-bullet" data-block-id="Bul000000001">乙</li>',
    );
  });

  it('默认 id 生成器（nanoid12）产出互不相同的 id', () => {
    const html = blocksToBulletHtml(['甲', '乙', '丙']);
    const ids = [...html.matchAll(/data-block-id="([^"]+)"/g)].map((m) => m[1]!);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});

describe('insertPastePlan 与 handler', () => {
  it('handler 插入后回调结果，并阻止默认粘贴', () => {
    const view = fakeView();
    const results: unknown[] = [];
    const event = pasteEvent('<p>hi</p>', 'hi');
    const handled = makePasteHandler((r) => results.push(r))(view, event);
    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(view.pasteHTML).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });

  it('多块 HTML → 插入的是 <li data-type="fl-bullet"> 而非裸段落', () => {
    const view = fakeView();
    const plan = buildPastePlan({ html: '<p>甲</p><p>乙</p>', text: '甲\n乙' })!;
    insertPastePlan(view, plan);
    const inserted = insertedHtml(view);
    expect(inserted).toContain('data-type="fl-bullet"');
    expect(inserted).toContain('data-block-id=');
    expect(inserted).not.toContain('<p>');
  });

  it('纯文本插入：内容被转义并作为单个块', () => {
    const view = fakeView();
    const plan = buildPastePlan({ html: '', text: 'a<b' })!;
    insertPastePlan(view, plan);
    const inserted = insertedHtml(view);
    expect(inserted).toContain('a&lt;b');
  });

  it('粘贴后区间按“插入前后 selection”推导（块级 ReplaceAroundStep 也能得到非空区间）', () => {
    const view = fakeView();
    const plan = buildPastePlan({ html: '<p>甲</p><p>乙</p>', text: '甲\n乙' })!;
    // 模拟 PM 插入后把光标推进到 12
    (view as unknown as { pasteHTML: (h: string) => void }).pasteHTML = (h: string) => {
      (view as unknown as { state: { selection: { from: number; to: number } } }).state.selection = { from: 12, to: 12 };
      void h;
    };
    const insertion = insertPastePlan(view, plan);
    expect(insertion).toEqual({ from: 1, to: 12 });
  });
});
