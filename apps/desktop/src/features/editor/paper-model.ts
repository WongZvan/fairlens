/**
 * 纸面分区模型（2026-11-05，#117）：模板决定分区如何落列。
 * duo = side(basic/skill) + main(education/experience/project)；classic/sidebar 扁平。
 * PM 序列化用内部 order attr 还原 ResumeDoc 的原始分区顺序。
 */
import type { Section } from '@fairlens/shared';

export type ColumnKind = 'side' | 'main';

export const SIDE_SECTION_TYPES: ReadonlyArray<Section['type']> = ['basic', 'skill'];

export function isSideSection(type: Section['type']): boolean {
  return SIDE_SECTION_TYPES.includes(type);
}

export function partitionSections(sections: Section[]): { side: Section[]; main: Section[] } {
  const side: Section[] = [];
  const main: Section[] = [];
  for (const section of sections) {
    (isSideSection(section.type) ? side : main).push(section);
  }
  return { side, main };
}

/** 按内部 order attr 稳定排序；无 order 的条目保持原有相对顺序排在后面 */
export function sortSectionsByOrder<T extends { order?: number | null }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ao = a.item.order;
      const bo = b.item.order;
      const aHas = typeof ao === 'number';
      const bHas = typeof bo === 'number';
      if (aHas && bHas && ao !== bo) return ao - bo;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return a.index - b.index;
    })
    .map((x) => x.item);
}
