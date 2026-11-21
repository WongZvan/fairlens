// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { describe, expect, it } from 'vitest';
import { flExtensions, linkMark } from './nodes.js';

/**
 * #128 首用闭环：分区/字段命令的结构行为。
 * - basic 分区不产「机构名称」条目（只留 header，字段由「添加字段」入口追加）
 * - 非 basic 分区保持 header + 空条目
 * - addBasicField 能按 sectionId 定位（分区标题按钮用的就是这条路径）
 */
function makeEditor(): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [Document, Paragraph, Text, Bold, Italic, linkMark, ...flExtensions],
    content: '<p></p>',
  });
}

function firstSection(editor: Editor): Record<string, unknown> {
  const json = editor.getJSON() as unknown as { content?: Array<Record<string, unknown>> };
  const section = json.content?.find((n) => n.type === 'flSection');
  if (!section) throw new Error('flSection missing');
  return section;
}

describe('分区结构命令（#128）', () => {
  it('basic 分区只插 header，不插条目', () => {
    const editor = makeEditor();
    editor.commands.insertSection({ type: 'basic', title: '基本信息' });
    const section = firstSection(editor);
    const children = section.content as Array<Record<string, unknown>>;
    expect(children).toHaveLength(1);
    expect(children[0]!.type).toBe('flSectionHeader');
    editor.destroy();
  });

  it('非 basic 分区保持 header + 一个空条目', () => {
    const editor = makeEditor();
    editor.commands.insertSection({ type: 'experience', title: '实习经历' });
    const children = firstSection(editor).content as Array<Record<string, unknown>>;
    expect(children.map((c) => c.type)).toEqual(['flSectionHeader', 'flEntry']);
    editor.destroy();
  });

  it('addBasicField 按 sectionId 追加到分区末尾', () => {
    const editor = makeEditor();
    editor.commands.insertSection({ type: 'basic', title: '基本信息' });
    const section = firstSection(editor);
    const sectionId = String((section.attrs as Record<string, unknown>).id);

    editor.commands.addBasicField({ sectionId, label: '字段' });

    const children = firstSection(editor).content as Array<Record<string, unknown>>;
    expect(children.at(-1)!.type).toBe('flBasicField');
    expect((children.at(-1)!.attrs as Record<string, unknown>).label).toBe('字段');
    editor.destroy();
  });
});
