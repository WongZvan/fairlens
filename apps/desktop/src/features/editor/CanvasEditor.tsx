/**
 * 画布编辑器（m1.4）：真 Tiptap 替换打样静态纸面。
 * 职责：模板 printCSS 注入（编辑样式=导出样式）+ 样式选项三维令牌应用 +
 * 分页参考线（CSS 近似）+ 权限矩阵 gating + 粘贴归一化四项（docs/01 §5.2/5.6/§8）。
 * 契约源=packages/shared/src/{resume,template}.ts。
 */
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import { FloatingToolbar } from './FloatingToolbar.js';
import { useEffect, useMemo } from 'react';
import type { DocStyle, ResumeDoc } from '@fairlens/shared';
import { validateDocStyleAgainstManifest } from '@fairlens/shared';
import { flExtensions, pmToResumeDoc, resumeDocToPm } from './nodes.js';
import { usePasteNormalization } from './use-paste-normalization.js';
import { resolveStyleVars } from './style-vars.js';
import { getBuiltinTemplate } from '../templates/builtin-registry.js';

export interface EditorApi {
  undo: () => void;
  redo: () => void;
}

export interface CanvasEditorProps {
  doc: ResumeDoc;
  onDocChange: (doc: ResumeDoc) => void;
  /** 编辑器就绪后暴露 undo/redo（工具栏按钮/快捷键消费） */
  onReady?: (api: EditorApi) => void;
  /** 结构 gating（§5.2）：增删条目等命令经 manifest 校验；编辑自由 */
  onStructureGate?: (manifestId: string) => void;
}

export function CanvasEditor({ doc, onDocChange, onReady }: CanvasEditorProps) {
  const builtin = getBuiltinTemplate(doc.templateId);
  const manifest = builtin?.manifest;

  // 样式三维：越界值回落（validateDocStyleAgainstManifest，切模板场景）
  const effectiveStyle: DocStyle = useMemo(() => {
    const check = manifest ? validateDocStyleAgainstManifest(manifest, doc.style) : { ok: true } as const;
    if (check.ok) return doc.style ?? {};
    return {}; // 越界整体回落默认（toast 提示由调用方在切换时做）
  }, [manifest, doc.style]);

  const pasteNormalization = usePasteNormalization();

  const editor = useEditor({
    extensions: [
      // 精确白名单（§5.2）：弃用 StarterKit——其内部扩展（listKeymap 等）在关闭 list 节点时仍引用
      // listItem 导致 schema 崩溃，且 v3 内置 link 与显式 Link 重复注册
      Document, Text, Paragraph, Bold, Italic, History,
      ...flExtensions,
      Placeholder.configure({ placeholder: '写下这条经历…' }),
    ],
    content: resumeDocToPm(doc),
    editorProps: {
      attributes: { class: 'fl-paper' },
      handlePaste: pasteNormalization,
    },
    onUpdate: ({ editor }) => {
      onDocChange(pmToResumeDoc(editor.getJSON(), { templateId: doc.templateId, style: doc.style }));
    },
  }, [doc.templateId]);

  // 模板 CSS 注入（编辑样式=导出样式：同一 printCSS 进 <style>）
  const templateCss = builtin?.printCss ?? '';
  const styleVars = resolveStyleVars(manifest, effectiveStyle);
  useEffect(() => {
    if (editor && onReady) onReady({ undo: () => editor.chain().focus().undo().run(), redo: () => editor.chain().focus().redo().run() });
  }, [editor, onReady]);

  return (
    <div className="canvas-wrap">
      <style>{templateCss}</style>
      <div className="fl-host" style={styleVars as React.CSSProperties} data-template={doc.templateId}>
        <EditorContent editor={editor} />
        <FloatingToolbar editor={editor} />
      </div>
      <PageGuides />
    </div>
  );
}

/** A4 分页参考线（CSS 近似；精确分页以导出为准——docs/01 §5.2 注记） */
function PageGuides() {
  return (
    <div className="page-guides" aria-hidden="true">
      <div className="page-guide" style={{ top: 297 * (96 / 25.4) * (2 / 3) }} />
    </div>
  );
}
