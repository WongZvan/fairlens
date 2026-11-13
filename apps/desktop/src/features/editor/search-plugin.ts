/**
 * 搜索高亮插件（2026-11-13，#126）：Decoration.inline 标出全部匹配，当前项加粗强调。
 * 全部装饰走 PluginKey 元数据；`addToHistory: false` 保证搜索不污染撤销栈。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { findMatches, type SearchMatch } from './search.js';

export interface SearchState {
  query: string;
  matches: SearchMatch[];
  /** 当前项下标（-1=无） */
  current: number;
}

export const searchPluginKey = new PluginKey<SearchState>('fl-search');

/** 由 query 与当前项算出状态（纯逻辑，便于在命令里复用） */
export function computeSearchState(doc: PMNode, query: string, current = 0): SearchState {
  const matches = findMatches(doc, query);
  return { query, matches, current: matches.length ? Math.min(current, matches.length - 1) : -1 };
}

function buildDecorations(doc: PMNode, state: SearchState): DecorationSet {
  if (!state.matches.length) return DecorationSet.empty;
  const decos = state.matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === state.current ? 'fl-search-hit fl-search-current' : 'fl-search-hit',
    }),
  );
  return DecorationSet.create(doc, decos);
}

export const SearchHighlight = Extension.create({
  name: 'flSearchHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchPluginKey,
        state: {
          init: () => ({ query: '', matches: [], current: -1 }),
          apply(tr, value) {
            const meta = tr.getMeta(searchPluginKey) as SearchState | undefined;
            if (meta) return meta;
            // 文档变化后匹配位置失效：用旧 query 重算（草稿式搜索，不跳转到旧位置）
            if (tr.docChanged && value.query) return computeSearchState(tr.doc, value.query, 0);
            return value;
          },
        },
        props: {
          decorations(state) {
            const pluginState = searchPluginKey.getState(state);
            return pluginState ? buildDecorations(state.doc, pluginState) : null;
          },
        },
      }),
    ];
  },
});