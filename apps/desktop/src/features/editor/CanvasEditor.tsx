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
import { useEffect, useMemo, useRef } from 'react';
import type { DocStyle, ResumeDoc } from '@fairlens/shared';
import { validateDocStyleAgainstManifest } from '@fairlens/shared';
import { flExtensions, pmToResumeDoc, resumeDocToPm } from './nodes.js';
import { usePasteNormalization } from './use-paste-normalization.js';
import { resolveStyleVars } from './style-vars.js';
import { getBuiltinTemplate } from '../templates/builtin-registry.js';

export interface EditorApi {
  undo: () => void;
  redo: () => void;
  /** 复制选区（focus + 原生 copy，经 ProseMirror 序列化=保留节点结构） */
  copy: () => void;
  /** 剪切选区（同上，cut 事件由 PM 处理） */
  cut: () => void;
  /** 粘贴系统剪贴板：text/html 走 schema 白名单解析；仅纯文本走文本插入 */
  paste: () => Promise<void>;
  selectAll: () => void;
  /** 光标所在条目（右键菜单/ Ctrl+D 复制条目定位用） */
  getActiveEntry: () => { sectionId: string; entryId: string } | null;
  /** 派发空事务：让依赖事务的 UI（悬浮工具条 shouldShow/定位）重新求值 */
  refresh: () => void;
}

export interface CanvasEditorProps {
  doc: ResumeDoc;
  onDocChange: (doc: ResumeDoc) => void;
  /** 编辑器就绪后暴露 undo/redo（工具栏按钮/快捷键消费） */
  onReady?: (api: EditorApi) => void;
  /** 结构 gating（§5.2）：增删条目等命令经 manifest 校验；编辑自由 */
  onStructureGate?: (manifestId: string) => void;
  /** 只读渲染（快照对比双栏用，m1.6） */
  readOnly?: boolean;
}

export function CanvasEditor({ doc, onDocChange, onReady, readOnly }: CanvasEditorProps) {
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
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'fl-paper' },
      handlePaste: pasteNormalization,
    },
    onUpdate: ({ editor }) => {
      const next = pmToResumeDoc(editor.getJSON(), { templateId: doc.templateId, style: doc.style });
      lastEmitted.current = next;
      onDocChange(next);
    },
  }, [doc.templateId, readOnly]);

  // 外部 doc 注入同步（m1.6 快照回滚是首个外部注入场景）：编辑器自身回流引用相等不写回，
  // 仅真正的外部变更（回滚/库切换）重置内容——emitUpdate:false 防二次落盘与光标打断
  const lastEmitted = useRef(doc);
  const lastTemplateId = useRef(doc.templateId);
  useEffect(() => {
    if (doc.templateId !== lastTemplateId.current) {
      // 模板重建路径：useEditor 已按新 doc 初始化内容
      lastTemplateId.current = doc.templateId;
      lastEmitted.current = doc;
      return;
    }
    if (doc === lastEmitted.current) return;
    lastEmitted.current = doc;
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(resumeDocToPm(doc), { emitUpdate: false });
    }
  }, [doc, editor]);

  // 模板 CSS 注入（编辑样式=导出样式：同一 printCSS 进 <style>）
  const templateCss = builtin?.printCss ?? '';
  const styleVars = resolveStyleVars(manifest, effectiveStyle);
  useEffect(() => {
    if (!editor || !onReady) return;
    const findEntry = () => {
      const { $from } = editor.state.selection;
      for (let d = $from.depth; d > 0; d -= 1) {
        const node = $from.node(d);
        if (node.type.name === 'flEntry') {
          const section = d > 1 ? $from.node(d - 1) : null;
          return { sectionId: String(section?.attrs.id ?? ''), entryId: String(node.attrs.id ?? '') };
        }
      }
      return null;
    };
    const insertPlainText = (text: string) => {
      const nodes: Array<Record<string, unknown>> = [];
      text.replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
        if (i > 0) nodes.push({ type: 'hardBreak' });
        if (line.length > 0) nodes.push({ type: 'text', text: line });
      });
      if (nodes.length > 0) editor.chain().focus().insertContent(nodes).run();
    };
    onReady({
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      copy: () => {
        editor.chain().focus().run();
        document.execCommand('copy');
      },
      cut: () => {
        editor.chain().focus().run();
        document.execCommand('cut');
      },
      paste: async () => {
        editor.chain().focus().run();
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const html = await (await item.getType('text/html')).text();
            // insertContent(html) 经 schema 解析——白名单/节点归一化自动生效（与 handlePaste 同源规则）
            editor.chain().focus().insertContent(html).run();
            return;
          }
        }
        const text = await navigator.clipboard.readText();
        if (text) insertPlainText(text);
      },
      selectAll: () => editor.chain().focus().selectAll().run(),
      getActiveEntry: findEntry,
      refresh: () => editor.view.dispatch(editor.state.tr),
    });
  }, [editor, onReady]);

  return (
    <div className="canvas-wrap">
      <style>{templateCss}</style>
      <div className="fl-host" style={styleVars as React.CSSProperties} data-template={doc.templateId}>
        <EditorContent editor={editor} />
        <FloatingToolbar editor={editor} readOnly={readOnly} />
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
