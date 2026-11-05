/** 大纲分区折叠纯函数（2026-11-05）：不可变增删，供 store 与单测共用 */
export function toggleCollapsed(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
