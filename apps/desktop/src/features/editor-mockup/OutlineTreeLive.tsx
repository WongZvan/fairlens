/**
 * 结构树（m1.5；#118 完整树）：从真 ResumeDoc 派生大纲（点击滚动定位画布块）。
 * 标题=section.title（画布 h3 可编辑，实时同步；空标题回落类型 i18n）；
 * 所有分区都显示；条目仅含有 bullet 的（可拖拽排序）；basicFields/skillGroups 为只读导航叶节点。
 */
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, PanelLeftClose } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ResumeDoc } from '@fairlens/shared';
import { useMockup } from '../../stores/mockup.js';
import { buildOutlineTree, outlineFieldLabel, outlineSkillLabel } from './outline-model.js';

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
  const collapsedSections = useMockup((s) => s.collapsedSections);
  const toggleSection = useMockup((s) => s.toggleSection);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const sections = buildOutlineTree(doc);

  const scrollTo = (blockId: string) => {
    const el = document.querySelector(`[data-block-id="${blockId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('flash-jump');
    setTimeout(() => el?.classList.remove('flash-jump'), 900);
  };

  return (
    <div className="outline-body">
      <button className="m-btn" onClick={toggleLeft} style={{ margin: '0 4px 10px', padding: '4px 10px' }} aria-label={t('editor.hideOutline')}>
        <PanelLeftClose size={14} />{t('editor.collapse')}
      </button>
      <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'var(--ade-muted)', margin: '2px 4px 8px' }}>{t('editor.outline')}</h2>
      {sections.length === 0 ? (
        <p className="tpl-note" style={{ color: 'var(--ade-muted)' }}>{t('editor.outlineEmpty')}</p>
      ) : (
        sections.map((item) => {
          const { section, entries, fields, skills, hasChildren } = item;
          const name = item.title ?? t(SECTION_TYPE_KEY[section.type] ?? 'paper.basic');
          const collapsed = collapsedSections.includes(section.id);
          return (
            <div key={section.id}>
              <div className="tree-item section-row">
                {hasChildren ? (
                  <button
                    type="button"
                    className="tree-toggle"
                    aria-expanded={!collapsed}
                    aria-label={t(collapsed ? 'editor.expandSection' : 'editor.collapseSection', { name })}
                    onClick={() => toggleSection(section.id)}
                  >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                ) : (
                  <span className="tree-toggle-spacer" aria-hidden="true" />
                )}
                <button type="button" className="tree-label" onClick={() => scrollTo(section.id)}>{name}</button>
              </div>
              {!collapsed && (
                <>
                  {fields.map((field) => (
                    <OutlineLeaf
                      key={field.id}
                      label={outlineFieldLabel(field)}
                      onClick={() => scrollTo(field.id)}
                    />
                  ))}
                  {skills.map((group) => (
                    <OutlineLeaf
                      key={group.id}
                      label={outlineSkillLabel(group)}
                      onClick={() => scrollTo(group.id)}
                    />
                  ))}
                  {entries.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => {
                        const { active, over } = e;
                        if (!over || active.id === over.id) return;
                        // 过滤后的展示序 ≠ 原数组序：按 entry id 回定位原索引（防拖拽错位）
                        const from = section.entries.findIndex((en) => en.id === active.id);
                        const to = section.entries.findIndex((en) => en.id === over.id);
                        if (from === -1 || to === -1) return;
                        onReorderEntry(section.id, from, to);
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
                  )}
                </>
              )}
            </div>
          );
        })
      )}
      <p className="tpl-note">{t('editor.tplNote')}</p>
    </div>
  );
}

/** 只读导航叶节点（基本信息字段/技能组）：不可拖拽，点击纸面定位 */
function OutlineLeaf({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="tree-item sub leaf" onClick={onClick}>
      <span className="tree-dot" aria-hidden="true" />
      <span
        className="tree-leaf-label"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {label}
      </span>
    </div>
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
