/**
 * 结构树（m1.5）：从真 ResumeDoc 派生大纲（点击滚动定位画布块），接 dnd-kit 拖拽排序。
 * 树=大纲视图（§5.2），数据真源=CanvasEditor 的 doc。
 */
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ResumeDoc } from '@fairlens/shared';
import { useMockup } from '../../stores/mockup.js';

interface TreeProps {
  doc: ResumeDoc;
  onReorderEntry: (sectionId: string, from: number, to: number) => void;
}

const SECTION_TYPE_KEY: Record<string, string> = {
  basic: 'paper.basic', education: 'paper.edu', experience: 'paper.exp',
  project: 'paper.proj', skill: 'paper.skills',
};

export function OutlineTreeLive({ doc, onReorderEntry }: TreeProps) {
  const { t } = useTranslation();
  const toggleLeft = useMockup((s) => s.toggleLeft);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 更严过滤（m1.6 反馈拍板）：entry 有 bullets 才进大纲（org 空壳不显示）；
  // section 在过滤后 entries/basicFields/skills 全空时不渲染；全空显示空态。
  const visibleSections = doc.sections
    .map((sec) => ({ sec, entries: sec.entries.filter((e) => e.bullets.length > 0) }))
    .filter(
      ({ sec, entries }) =>
        entries.length > 0 || (sec.basicFields?.length ?? 0) > 0 || (sec.skills?.length ?? 0) > 0,
    );

  const scrollTo = (blockId: string) => {
    const el = document.querySelector(`[data-block-id="${blockId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('flash-jump');
    setTimeout(() => el?.classList.remove('flash-jump'), 900);
  };

  return (
    <aside className="m-left" aria-label={t('editor.outline')}>
      <button className="m-btn" onClick={toggleLeft} style={{ margin: '0 4px 10px', padding: '4px 10px' }} aria-label={t('editor.hideOutline')}>
        <PanelLeftCloseInline />{t('editor.collapse')}
      </button>
      <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'var(--ade-muted)', margin: '2px 4px 8px' }}>{t('editor.outline')}</h2>
      {visibleSections.length === 0 ? (
        <p className="tpl-note" style={{ color: 'var(--ade-muted)' }}>{t('editor.outlineEmpty')}</p>
      ) : (
        visibleSections.map(({ sec, entries }) => (
          <div key={sec.id}>
            <div className="tree-item" role="button" tabIndex={0} onClick={() => scrollTo(sec.id)} onKeyDown={(e) => e.key === 'Enter' && scrollTo(sec.id)}>
              <ChevronDown size={14} />{t(SECTION_TYPE_KEY[sec.type] ?? 'paper.basic')}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                // 过滤后的展示序 ≠ 原数组序：按 entry id 回定位原索引（防拖拽错位）
                const from = sec.entries.findIndex((en) => en.id === active.id);
                const to = sec.entries.findIndex((en) => en.id === over.id);
                if (from === -1 || to === -1) return;
                onReorderEntry(sec.id, from, to);
              }}
            >
              <SortableContext items={entries.map((en) => en.id)} strategy={verticalListSortingStrategy}>
                {entries.map((entry) => (
                  <SortableEntry
                    key={entry.id}
                    id={entry.id}
                    label={`${entry.org || t('editor.untitledEntry')}${entry.role ? ' · ' + entry.role : ''}`}
                    onClick={() => scrollTo(entry.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ))
      )}
      <p className="tpl-note">{t('editor.tplNote')}</p>
    </aside>
  );
}

function SortableEntry({ id, label, onClick }: { id: string; label: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      className="tree-item sub"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, cursor: 'default' }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if ((e as unknown as { detail: number }).detail === 0) return; // 拖拽结束的合成点击不触发滚动
        onClick();
      }}
    >
      <GripVertical size={12} style={{ cursor: 'grab', touchAction: 'none' }} />
      <span role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>{label}</span>
    </div>
  );
}

/** PanelLeftClose 内联（避免与 EditorMockup 的 import 重复声明冲突而集中导入） */
import { PanelLeftClose } from 'lucide-react';
function PanelLeftCloseInline() {
  return <PanelLeftClose size={14} />;
}
