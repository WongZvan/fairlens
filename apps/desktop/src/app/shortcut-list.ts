/**
 * 快捷键速查表（#127）：单一数据源，供「视图 → 快捷键速查」渲染。
 * 与 shortcuts.ts 的键位一致性由单测锁定（新增快捷键必须同步这里，否则用户查不到）。
 */
export interface ShortcutEntry {
  keys: string;
  labelKey: string;
}

export interface ShortcutGroup {
  titleKey: string;
  items: ShortcutEntry[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: 'shortcuts.global',
    items: [
      { keys: 'Ctrl+K', labelKey: 'shortcuts.palette' },
      { keys: 'Ctrl+S', labelKey: 'shortcuts.save' },
      { keys: 'Ctrl+F', labelKey: 'shortcuts.find' },
      { keys: 'Ctrl+D', labelKey: 'shortcuts.duplicate' },
      { keys: 'Ctrl+Shift+K', labelKey: 'shortcuts.link' },
      { keys: 'Ctrl+Shift+V', labelKey: 'shortcuts.pastePlain' },
      { keys: 'Alt+F4', labelKey: 'shortcuts.exit' },
      { keys: '?', labelKey: 'shortcuts.help' },
    ],
  },
  {
    titleKey: 'shortcuts.editing',
    items: [
      { keys: 'Enter', labelKey: 'shortcuts.newBullet' },
      { keys: 'Shift+Enter', labelKey: 'shortcuts.softBreak' },
      { keys: 'Tab', labelKey: 'shortcuts.indent' },
      { keys: 'Shift+Tab', labelKey: 'shortcuts.outdent' },
      { keys: 'Ctrl+Z', labelKey: 'shortcuts.undo' },
      { keys: 'Ctrl+Y', labelKey: 'shortcuts.redo' },
      { keys: 'Ctrl+点击', labelKey: 'shortcuts.openLink' },
      { keys: 'Ctrl+滚轮', labelKey: 'shortcuts.zoom' },
    ],
  },
];

/** 所有键位（单测用于与 shortcuts.ts 对齐） */
export function allShortcutKeys(): string[] {
  return SHORTCUT_GROUPS.flatMap((group) => group.items.map((item) => item.keys));
}
