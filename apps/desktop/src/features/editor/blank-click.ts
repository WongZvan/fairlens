/**
 * 点纸面空白处的"追加要点"判定（#114）：纯函数，便于单测。
 * 判定为「点不在文字上」且「点击位置在该条目最后一条要点之下」→ 返回目标 entryId；
 * 点文字/要点/标题一律 null（交给编辑器默认光标）。
 */
export interface AppendTargetInput {
  /** 点击目标是否落在文字块上（要点/标题/链接） */
  onText: boolean;
  /** 点击在条目容器内时的条目信息 */
  hitEntry: { entryId: string; lastBulletBottom: number } | null;
  /** 点击在分区空白（条目之外）时，点击位置上方最近的条目 */
  aboveEntryInSection: { entryId: string; lastBulletBottom: number } | null;
  /** 纸面底部空白：文档最后一个条目 */
  lastEntryInDoc: { entryId: string; lastEntryBottom: number } | null;
  clickY: number;
}

const EDGE = 2; // 允许 2px 误差（行高/缩放取整）

export function pickAppendTarget(input: AppendTargetInput): string | null {
  const { onText, hitEntry, aboveEntryInSection, lastEntryInDoc, clickY } = input;
  if (onText) return null;
  if (hitEntry && clickY >= hitEntry.lastBulletBottom - EDGE) return hitEntry.entryId;
  if (aboveEntryInSection && clickY >= aboveEntryInSection.lastBulletBottom - EDGE) return aboveEntryInSection.entryId;
  if (lastEntryInDoc && clickY >= lastEntryInDoc.lastEntryBottom - EDGE) return lastEntryInDoc.entryId;
  return null;
}
