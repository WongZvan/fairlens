import type { Bullet, Entry, ResumeDoc } from '@fairlens/shared';

/**
 * 快照对比（§5.6「按 blockId 对齐三态 diff」）。
 * 规格的"三态"未细化定义——工程实现取四态（unchanged/changed/added/removed），
 * 否则"回滚会删掉的块"信息丢失（偏离注记：m1.6 模块 MD）。
 * 比较粒度=各节点自身 payload（子节点变化不冒泡到父级，列表按叶子定位）。
 */

export type DiffStatus = 'unchanged' | 'changed' | 'added' | 'removed';

export interface DiffItem {
  id: string;
  kind: 'doc' | 'section' | 'entry' | 'bullet' | 'basic-field' | 'skill-group';
  status: DiffStatus;
  /** 可读摘要，UI 直显 */
  label: string;
  /** UI 跳转锚点：所属 section id（doc 级无） */
  sectionId?: string;
}

export interface SnapshotDiff {
  items: DiffItem[];
  counts: Record<DiffStatus, number>;
  hasChanges: boolean;
}

interface Node {
  id: string;
  kind: DiffItem['kind'];
  label: string;
  sectionId?: string;
  payload: unknown;
}

const runsText = (b: Bullet) =>
  b.runs
    .map((r) => r.text)
    .join('')
    .slice(0, 40);

/** 逐节点自身 payload（不含子树）展开为 id→node 平面表 */
function collect(doc: ResumeDoc): Map<string, Node> {
  const map = new Map<string, Node>();
  for (const sec of doc.sections) {
    map.set(sec.id, {
      id: sec.id,
      kind: 'section',
      sectionId: sec.id,
      label: sec.title,
      // photo 变更归入 section（PhotoSlot 无独立展示位）
      payload: { type: sec.type, title: sec.title, photo: sec.photo ?? null },
    });
    for (const f of sec.basicFields ?? []) {
      map.set(f.id, {
        id: f.id,
        kind: 'basic-field',
        sectionId: sec.id,
        label: `${f.label}：${f.value}`,
        payload: { label: f.label, value: f.value, href: f.href ?? null },
      });
    }
    for (const e of sec.entries) {
      const entrySelf = (en: Entry) => ({
        org: en.org,
        role: en.role ?? null,
        start: en.start ?? null,
        end: en.end ?? null,
        ongoing: en.ongoing ?? null,
        pageBreakBefore: en.pageBreakBefore ?? null,
      });
      map.set(e.id, {
        id: e.id,
        kind: 'entry',
        sectionId: sec.id,
        label: [e.org, e.role].filter(Boolean).join(' · '),
        payload: entrySelf(e),
      });
      for (const b of e.bullets) {
        map.set(b.id, {
          id: b.id,
          kind: 'bullet',
          sectionId: sec.id,
          label: runsText(b),
          payload: b.runs,
        });
      }
    }
    for (const g of sec.skills ?? []) {
      map.set(g.id, {
        id: g.id,
        kind: 'skill-group',
        sectionId: sec.id,
        label: g.name,
        payload: { name: g.name, items: g.items },
      });
    }
  }
  return map;
}

/** base=快照（旧），target=当前文档（新）；status 以「快照→当前」的方向命名 */
export function alignBlockDiff(base: ResumeDoc, target: ResumeDoc): SnapshotDiff {
  const items: DiffItem[] = [];

  // doc 级：模板/样式（快照回滚恢复模板归属）
  if (base.templateId !== target.templateId || JSON.stringify(base.style ?? {}) !== JSON.stringify(target.style ?? {})) {
    items.push({
      id: '__doc__',
      kind: 'doc',
      status: 'changed',
      label: `模板/样式（${base.templateId} → ${target.templateId}）`,
    });
  }

  const baseNodes = collect(base);
  const targetNodes = collect(target);

  for (const node of targetNodes.values()) {
    const old = baseNodes.get(node.id);
    if (!old) {
      items.push({ id: node.id, kind: node.kind, sectionId: node.sectionId, status: 'added', label: node.label });
    } else {
      const same = JSON.stringify(old.payload) === JSON.stringify(node.payload);
      items.push({
        id: node.id,
        kind: node.kind,
        sectionId: node.sectionId,
        status: same ? 'unchanged' : 'changed',
        label: node.label,
      });
    }
  }
  for (const node of baseNodes.values()) {
    if (!targetNodes.has(node.id)) {
      items.push({ id: node.id, kind: node.kind, sectionId: node.sectionId, status: 'removed', label: node.label });
    }
  }

  const counts: Record<DiffStatus, number> = { unchanged: 0, changed: 0, added: 0, removed: 0 };
  for (const it of items) counts[it.status] += 1;
  return { items, counts, hasChanges: counts.changed + counts.added + counts.removed > 0 };
}
