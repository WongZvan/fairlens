import type { ResumeMeta } from '@fairlens/core';

/** 首启示例的三态判定（#129）：真库升级不得重复播种 */
export type SeedAction = 'none' | 'mark-only' | 'seed';

export function resolveSeedAction(markerSeeded: boolean, resumeCount: number): SeedAction {
  if (markerSeeded) return 'none';
  return resumeCount > 0 ? 'mark-only' : 'seed';
}

/** 归档筛选：默认只显示 active；showArchived 时全部显示（置灰交给视图） */
export function visibleResumes(metas: ResumeMeta[], showArchived: boolean): ResumeMeta[] {
  return showArchived ? metas : metas.filter((m) => m.status === 'active');
}

export function archivedCount(metas: ResumeMeta[]): number {
  return metas.filter((m) => m.status === 'archived').length;
}

/** 新建简历标题去重：我的简历 / 我的简历 2 / 我的简历 3 … */
export function nextResumeTitle(base: string, existingTitles: string[]): string {
  const titles = new Set(existingTitles);
  if (!titles.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base} ${i}`;
    if (!titles.has(candidate)) return candidate;
  }
  return base;
}

/** 卡片时间展示：结构化返回，中文文案由 i18n 组装（不在纯函数里写死文案） */
export type UpdatedAt =
  | { kind: 'today'; time: string }
  | { kind: 'yesterday'; time: string }
  | { kind: 'date'; date: string };

const pad = (n: number) => String(n).padStart(2, '0');

export function formatUpdatedAt(iso: string, now = new Date()): UpdatedAt {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { kind: 'date', date: iso };
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (dayDiff === 0) return { kind: 'today', time };
  if (dayDiff === 1) return { kind: 'yesterday', time };
  const date = d.getFullYear() === now.getFullYear()
    ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { kind: 'date', date };
}
