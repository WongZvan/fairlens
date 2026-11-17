/**
 * 命令栏菜单模型（2026-11-13，#124）：纯函数，便于单测。
 *
 * 为什么是「单行命令栏 + 四菜单」而不是 Office/WPS 的多行 Ribbon：
 * 960×640 最小窗口下 Ribbon 要多占 ~88px 画布（现固定 chrome 已 116px/18%）；
 * 且「开始/插入/布局」三组里字体/字号/颜色/页边距/表格/图片全部被 §5.2 权限矩阵禁止，
 * 会得到一个大部分按钮只能置灰的功能区——这是最差的可发现性。
 *
 * 未实现的项一律 `disabled` + 「未开放」徽标 + 人话说明（#127 起不再把里程碑编号写进界面），
 * 不做「点了没反应」的空按钮。
 */

export type MenuId = 'file' | 'edit' | 'view' | 'ai';

export type MenuActionId =
  // 文件
  | 'file.new'
  | 'file.open'
  | 'file.save'
  | 'file.clear-sample'
  | 'file.export'
  | 'file.export-archive'
  | 'file.snapshot-create'
  | 'file.snapshot-restore'
  | 'file.export-pdf'
  | 'file.export-word'
  | 'file.export-pdf-annotated'
  | 'file.export-png'
  | 'file.export-html'
  | 'file.back-library'
  // 编辑
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.paste-plain'
  | 'edit.select-all'
  | 'edit.find'
  | 'edit.duplicate-bullet'
  | 'edit.add-section'
  | 'edit.delete-section'
  // 视图
  | 'view.toggle-left'
  | 'view.toggle-right'
  | 'view.zoom-fit-width'
  | 'view.zoom-fit-page'
  | 'view.zoom-100'
  | 'view.theme-light'
  | 'view.theme-dark'
  | 'view.theme-system'
  | 'view.shortcuts'
  // AI
  | 'ai.evaluate'
  | 'ai.walkthrough'
  | 'ai.revise';

export interface MenuItem {
  id: MenuActionId;
  label: string;
  /** 快捷键提示（右对齐灰字） */
  hint?: string;
  /** 未开放徽标（#127 起不再显示里程碑编号） */
  badge?: string;
  /** 悬停说明：为什么不可用/什么时候可用（人话） */
  note?: string;
  disabled?: boolean;
  /** 分组内前置分隔线 */
  separatorBefore?: boolean;
  /** 作为子菜单标题（导出） */
  submenu?: MenuItem[];
}

export interface MenuDef {
  id: MenuId;
  label: string;
  items: MenuItem[];
}

export interface MenuContext {
  /** 是否在编辑器视图（library 视图下大部分编辑项不可用） */
  inEditor: boolean;
  /** 当前主题（打勾用） */
  theme: 'light' | 'dark' | 'system';
  /** 缩放模式（打勾用） */
  zoomMode: 'fit-width' | 'fit-page' | number;
}

/**
 * 构建四个菜单。`t` 传入 i18n 函数（便于测试注入假实现）。
 * 未实现项一律 disabled + 「未开放」徽标 + 人话说明（#127，替代里程碑编号）。
 */
export function buildMenus(t: (key: string, vars?: Record<string, unknown>) => string, ctx: MenuContext): MenuDef[] {
  const editorOnly = ctx.inEditor;
  const need = (ok: boolean) => ({ disabled: !ok });
  const closed = (noteKey: string) => ({ disabled: true, badge: t('menu.unavailable'), note: t(noteKey) });

  return [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        { id: 'file.new', label: t('menu.fileNew'), ...closed('menu.noteNewOpen') },
        { id: 'file.open', label: t('menu.fileOpen'), ...closed('menu.noteNewOpen') },
        { id: 'file.save', label: t('menu.fileSave'), hint: 'Ctrl+S', separatorBefore: true, ...need(editorOnly) },
        { id: 'file.clear-sample', label: t('menu.fileClear'), ...need(editorOnly) },
        { id: 'file.snapshot-create', label: t('menu.fileSnapshotCreate'), separatorBefore: true, ...need(editorOnly) },
        { id: 'file.snapshot-restore', label: t('menu.fileSnapshotRestore'), ...need(editorOnly) },
        {
          id: 'file.export',
          label: t('menu.fileExport'),
          separatorBefore: true,
          submenu: [
            { id: 'file.export-pdf', label: t('menu.exportPdf'), ...need(editorOnly) },
            { id: 'file.export-archive', label: t('menu.fileArchive'), ...need(editorOnly) },
            { id: 'file.export-word', label: t('menu.exportWord'), ...closed('menu.noteExportFormats') },
            { id: 'file.export-pdf-annotated', label: t('menu.exportPdfAnnotated'), separatorBefore: true, ...closed('menu.noteExportFormats') },
            { id: 'file.export-png', label: t('menu.exportPng'), ...closed('menu.noteExportFormats') },
            { id: 'file.export-html', label: t('menu.exportHtml'), ...closed('menu.noteExportFormats') },
          ],
        },
        { id: 'file.back-library', label: t('menu.fileBackLibrary'), separatorBefore: true },
        // #127 二次打磨：文件菜单不放「关闭窗口/退出」——文案易被误读为“关下拉”，
        // 且误点直接退出应用。退出只保留标题栏 ✕ 与 Alt+F4（Windows 系统键，Tauri 拦为 CloseRequested）。
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit'),
      items: [
        { id: 'edit.undo', label: t('menu.editUndo'), hint: 'Ctrl+Z', ...need(editorOnly) },
        { id: 'edit.redo', label: t('menu.editRedo'), hint: 'Ctrl+Y', ...need(editorOnly) },
        { id: 'edit.cut', label: t('menu.editCut'), hint: 'Ctrl+X', separatorBefore: true, ...need(editorOnly) },
        { id: 'edit.copy', label: t('menu.editCopy'), hint: 'Ctrl+C', ...need(editorOnly) },
        { id: 'edit.paste', label: t('menu.editPaste'), hint: 'Ctrl+V', ...need(editorOnly) },
        { id: 'edit.paste-plain', label: t('menu.editPastePlain'), hint: 'Ctrl+Shift+V', ...need(editorOnly) },
        { id: 'edit.select-all', label: t('menu.editSelectAll'), hint: 'Ctrl+A', ...need(editorOnly) },
        { id: 'edit.find', label: t('menu.editFind'), hint: 'Ctrl+F', separatorBefore: true, ...need(editorOnly) },
        { id: 'edit.duplicate-bullet', label: t('menu.editDuplicate'), hint: 'Ctrl+D', ...need(editorOnly) },
        { id: 'edit.add-section', label: t('menu.editAddSection'), separatorBefore: true, ...need(editorOnly) },
        { id: 'edit.delete-section', label: t('menu.editDeleteSection'), ...need(editorOnly) },
      ],
    },
    {
      id: 'view',
      label: t('menu.view'),
      items: [
        { id: 'view.toggle-left', label: t('menu.viewToggleLeft'), ...need(editorOnly) },
        { id: 'view.toggle-right', label: t('menu.viewToggleRight'), ...need(editorOnly) },
        { id: 'view.zoom-fit-width', label: t('menu.viewZoomFitWidth'), separatorBefore: true, ...(ctx.zoomMode === 'fit-width' ? { hint: '✓' } : {}), ...need(editorOnly) },
        { id: 'view.zoom-fit-page', label: t('menu.viewZoomFitPage'), ...(ctx.zoomMode === 'fit-page' ? { hint: '✓' } : {}), ...need(editorOnly) },
        { id: 'view.zoom-100', label: t('menu.viewZoom100'), ...(ctx.zoomMode === 1 ? { hint: '✓' } : {}), ...need(editorOnly) },
        { id: 'view.theme-light', label: t('theme.light'), separatorBefore: true, ...(ctx.theme === 'light' ? { hint: '✓' } : {}) },
        { id: 'view.theme-dark', label: t('theme.dark'), ...(ctx.theme === 'dark' ? { hint: '✓' } : {}) },
        { id: 'view.theme-system', label: t('theme.system'), ...(ctx.theme === 'system' ? { hint: '✓' } : {}) },
        { id: 'view.shortcuts', label: t('menu.viewShortcuts'), hint: '?', separatorBefore: true },
      ],
    },
    {
      id: 'ai',
      label: t('menu.ai'),
      items: [
        { id: 'ai.evaluate', label: t('menu.aiEvaluate'), ...closed('menu.noteAi') },
        { id: 'ai.walkthrough', label: t('menu.aiWalkthrough'), ...closed('menu.noteAi') },
        { id: 'ai.revise', label: t('menu.aiRevise'), separatorBefore: true, ...closed('menu.noteAi') },
      ],
    },
  ];
}

/** 扁平化（渲染子菜单/查找动作时用） */
export function flattenItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => [item, ...(item.submenu ? flattenItems(item.submenu) : [])]);
}

/**
 * 在给定菜单集里查一个**叶子动作**（用于测试与命令分发）。
 * 跳过子菜单父项（它只是分组标题，与首个子项共用 id 会造成误导）。
 */
export function findItem(menus: MenuDef[], id: MenuActionId): MenuItem | undefined {
  for (const menu of menus) {
    const found = flattenItems(menu.items).find((item) => item.id === id && !item.submenu);
    if (found) return found;
  }
  return undefined;
}
