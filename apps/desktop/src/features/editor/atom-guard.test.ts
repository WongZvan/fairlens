import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import type { Node as PMDocNode } from '@tiptap/pm/model';
import { flExtensions, resumeDocToPm } from './nodes.js';
import { shouldBlockAtomDeletion } from './atom-guard.js';
import type { ResumeDoc } from '@fairlens/shared';

const schema = getSchema([Document, Text, Paragraph, Bold, Italic, ...flExtensions]);

/** 页头 + 分区(标题) + 条目(头 + 两条要点) */
const doc: ResumeDoc = {
  templateId: 'tpl-classic',
  profile: { name: '李思远' },
  sections: [
    {
      id: 'SecA00000001',
      type: 'experience',
      title: '实习经历',
      entries: [
        {
          id: 'EntA00000001',
          org: '字节跳动',
          bullets: [
            { id: 'BulA00000001', runs: [{ text: '第一条要点' }] },
            { id: 'BulA00000002', runs: [{ text: '第二条要点' }] },
          ],
        },
        {
          id: 'EntA00000002',
          org: '腾讯',
          bullets: [{ id: 'BulA00000003', runs: [{ text: '下一条目' }] }],
        },
      ],
    },
  ],
};

const pm = schema.nodeFromJSON(resumeDocToPm(doc));

function stateAt(pos: number): EditorState {
  return EditorState.create({ doc: pm, selection: TextSelection.create(pm, pos) });
}

function findNode(typeName: string, nth = 0): { pos: number; node: PMDocNode } {
  let hit: { pos: number; node: PMDocNode } | null = null;
  let count = 0;
  pm.descendants((node, pos) => {
    if (hit) return false; // 命中后停止整棵树的遍历（返回 false 只跳过子树，不会阻止后续兄弟）
    if (node.type.name !== typeName) return true;
    if (count === nth) {
      hit = { pos, node };
      return false;
    }
    count += 1;
    return true;
  });
  if (!hit) throw new Error(`node ${typeName}#${nth} not found`);
  return hit;
}

describe('shouldBlockAtomDeletion（#127 结构锚点守卫）', () => {
  it('分区标题行首 Backspace → 拦（否则会删掉页头/profile）', () => {
    const header = findNode('flSectionHeader');
    expect(shouldBlockAtomDeletion(stateAt(header.pos + 1), 'back')).toBe(true);
  });

  it('第一条要点行首 Backspace → 拦（否则会删掉条目头）', () => {
    const first = findNode('flBullet', 0);
    expect(shouldBlockAtomDeletion(stateAt(first.pos + 1), 'back')).toBe(true);
  });

  it('第二条要点行首 Backspace → 放行（允许与上一条合并）', () => {
    const second = findNode('flBullet', 1);
    expect(shouldBlockAtomDeletion(stateAt(second.pos + 1), 'back')).toBe(false);
  });

  it('行中 Backspace → 放行', () => {
    const first = findNode('flBullet', 0);
    expect(shouldBlockAtomDeletion(stateAt(first.pos + 3), 'back')).toBe(false);
  });

  it('最后一条要点末尾 Delete → 拦（否则会把下一条目并进来）', () => {
    const second = findNode('flBullet', 1);
    const end = second.pos + second.node.nodeSize - 1;
    expect(shouldBlockAtomDeletion(stateAt(end), 'forward')).toBe(true);
  });

  it('第一条要点末尾 Delete → 放行（下一条要点可合并）', () => {
    const first = findNode('flBullet', 0);
    const end = first.pos + first.node.nodeSize - 1;
    expect(shouldBlockAtomDeletion(stateAt(end), 'forward')).toBe(false);
  });

  it('非空选区不拦（交给默认行为）', () => {
    const first = findNode('flBullet', 0);
    const sel = TextSelection.create(pm, first.pos + 1, first.pos + 3);
    const state = EditorState.create({ doc: pm, selection: sel });
    expect(shouldBlockAtomDeletion(state, 'back')).toBe(false);
  });
});
