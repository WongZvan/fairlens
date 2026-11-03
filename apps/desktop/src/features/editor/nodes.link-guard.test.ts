import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { collectWhitespaceLinkRanges, flExtensions, linkMark } from './nodes.js';

/** #113：纯空白文本自动脱链（避免空格延长链接下划线） */
describe('collectWhitespaceLinkRanges', () => {
  const schema = getSchema([Document, Paragraph, Text, Bold, Italic, linkMark, ...flExtensions]);
  const linkType = schema.marks.link;
  if (!linkType) throw new Error('link mark missing in test schema');
  const link = () => linkType.create({ href: 'https://example.com' });

  it('纯空白+链接 → 收集；含文字/无链接的空白 → 不收集', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('   ', [link()]), // from 1..4
        schema.text('正文', [link()]),
        schema.text('  '),
      ]),
    ]);
    expect(collectWhitespaceLinkRanges(doc, linkType)).toEqual([{ from: 1, to: 4 }]);
  });

  it('多处空白链接全部收集（含制表/换行）', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text(' ', [link()]),
        schema.text('文字'),
        schema.text('\t', [link()]),
      ]),
    ]);
    const ranges = collectWhitespaceLinkRanges(doc, linkType);
    expect(ranges).toHaveLength(2);
  });

  it('无空白链接 → 空数组', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('正常链接', [link()])])]);
    expect(collectWhitespaceLinkRanges(doc, linkType)).toEqual([]);
  });
});
