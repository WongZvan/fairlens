/**
 * 编辑器动作总线（2026-11-13，#124）：
 * 命令栏在 AppShell（壳层），编辑器的 EditorApi 与对话框状态在 EditorMockup（视图层）。
 * 直接向下传 ref/props 会把壳层与编辑器耦死，改用模块级单一注册表：
 * EditorMockup 挂载时注册处理函数，命令栏派发动作 id，返回值表示是否已处理。
 *
 * 约束：同一时刻只允许一个编辑器（单编辑器应用；多标签=1.0 之后的事）。
 * 未注册时派发返回 false，调用方据此 toast「编辑器未就绪」而不是静默。
 */
export type EditorActionId =
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
  | 'file.snapshot-create'
  | 'file.snapshot-restore'
  | 'file.clear-sample';

type Handler = (id: EditorActionId) => boolean;

let handler: Handler | null = null;

/** 注册（返回注销函数，供 useEffect cleanup） */
export function registerEditorActions(fn: Handler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/** 派发；true=已被编辑器处理 */
export function dispatchEditorAction(id: EditorActionId): boolean {
  return handler ? handler(id) : false;
}

/** 是否有编辑器在注册（命令栏可用性判断/测试用） */
export function hasEditorActions(): boolean {
  return handler !== null;
}