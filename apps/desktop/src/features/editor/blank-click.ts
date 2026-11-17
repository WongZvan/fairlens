/**
 * 点纸面空白处的插入判定（#114 起；#127 全量版）。
 *
 * 用户拍板（2026-11-17）：条目间也要能插。规则：
 * - 点文字（要点/标题/链接）→ null，交给编辑器默认光标；
 * - 条目容器内、最后一条要点之下 → 追加要点；
 * - 条目容器内、两条要点之间（含标题与首条要点之间）→ 在该位置插入要点；
 * - 分区内、不在条目容器里（条目之间的空隙 / 空分区 / 分区底部）→ 在该位置插入新条目；
 * - 纸面灰区（不属于任何分区）→ null：不往错误分区插东西。
 *
 * 纯函数：几何由调用方（CanvasEditor）从 DOM 取，便于单测锁定判定。
 */
export interface EntryBox {
  entryId: string;
  top: number;
  bottom: number;
  /** 每条要点的底边（自上而下） */
  bulletBottoms: number[];
}

export interface SectionBox {
  sectionId: string;
  /** 该分区内所有条目（自上而下） */
  entries: EntryBox[];
}

export interface ClickContext {
  /** 点击目标是否落在文字块上 */
  onText: boolean;
  /** 点击在条目容器内时的几何 */
  hitEntry: EntryBox | null;
  /** 点击在分区内（含条目之间/空分区）时的几何 */
  section: SectionBox | null;
  clickY: number;
}

export type ClickTarget =
  | { kind: 'append-bullet'; entryId: string }
  | { kind: 'insert-bullet'; entryId: string; index: number }
  | { kind: 'insert-entry'; sectionId: string; index: number };

const EDGE = 2; // 允许 2px 误差（行高/缩放取整）

export function pickClickTarget(ctx: ClickContext): ClickTarget | null {
  const { onText, hitEntry, section, clickY } = ctx;
  if (onText) return null;

  if (hitEntry) {
    const { entryId, bulletBottoms } = hitEntry;
    const last = bulletBottoms[bulletBottoms.length - 1];
    if (last === undefined || clickY >= last - EDGE) return { kind: 'append-bullet', entryId };
    // 落在某条要点的上方/两条之间：插到第一条"底边仍在点击位置之下"的要点之前
    const index = bulletBottoms.findIndex((bottom) => clickY < bottom - EDGE);
    return { kind: 'insert-bullet', entryId, index: index === -1 ? bulletBottoms.length : index };
  }

  if (!section) return null; // 纸面灰区：不响应
  const index = section.entries.findIndex((entry) => clickY < entry.top - EDGE);
  return { kind: 'insert-entry', sectionId: section.sectionId, index: index === -1 ? section.entries.length : index };
}
