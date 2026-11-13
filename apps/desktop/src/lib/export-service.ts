/**
 * 导出服务（2026-11-13，#125）：PDF 直出文件 + 归档 JSON 落盘。
 *
 * 与"打印"的区别：PDF 用 WebView2 `PrintToPdf` **直接写文件**（无对话框弹打印），
 * 路径由 `tauri-plugin-dialog` 的「另存为」提供。`window.print()` 会走系统打印对话框，
 * 不符合"导出=下载到本地"的语义，故不用。
 *
 * 文件名遵循 §9：`姓名_简历[_批注版]_YYYY-MM-DD.ext`。默认目录=系统文档目录。
 */
import { invoke } from '@tauri-apps/api/core';
import { documentDir } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import type { FairlensFile, ResumeRecord, SnapshotRow } from '@fairlens/shared';

/**
 * 文件名：`姓名_简历_YYYY-MM-DD.pdf`。
 * 姓名取 profile.name；缺失时用 `我的简历`（不编造）。非法文件名字符替换为 `_`。
 */
export function exportFileName(name: string | undefined, kind: 'pdf' | 'fairlens', date = new Date()): string {
  const safeName = (name ?? '').trim().replace(/[\\/:*?"<>|]/g, '_') || '我的简历';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${safeName}_简历_${y}-${m}-${d}.${kind}`;
}

async function defaultDir(): Promise<string | undefined> {
  try {
    return await documentDir();
  } catch {
    return undefined; // 拿不到就交给 dialog 的默认值（不阻断导出）
  }
}

export interface ExportResult {
  ok: boolean;
  /** 成功：写出的文件路径（用于「打开所在文件夹」） */
  path?: string;
  /** 失败原因（用户取消返回 null，调用方静默） */
  error?: string;
}

/** 导出 PDF：选路径 → 调 Rust PrintToPdf */
export async function exportPdf(name: string | undefined): Promise<ExportResult | null> {
  const dir = await defaultDir();
  const path = await save({
    title: '导出 PDF',
    defaultPath: dir ? `${dir}\\${exportFileName(name, 'pdf')}` : exportFileName(name, 'pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!path) return null; // 用户取消
  try {
    await invoke('export_pdf', { path });
    return { ok: true, path };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** 组装 .fairlens（kind:'resume'：单份简历 + 全部快照） */
export function buildArchiveRecord(input: {
  resume: ResumeRecord;
  snapshots: SnapshotRow[];
  now?: Date;
}): FairlensFile {
  return {
    format: 'fairlens-archive',
    version: 1,
    kind: 'resume',
    exportedAt: (input.now ?? new Date()).toISOString(),
    resumes: [
      {
        resume: input.resume,
        snapshots: input.snapshots,
        // review_sessions / ai_patch_log 至今没有写入方（M3/M4 才产生数据），
        // 导出空数组是如实反映现状，不是漏做——见 ADR 2026-11-13-command-bar.md
        reviewSessions: [],
        patchLog: [],
      },
    ],
  };
}

/** 另存为归档：选路径 → 调 Rust 写文件 */
export async function exportArchive(payload: FairlensFile, name: string | undefined): Promise<ExportResult | null> {
  const dir = await defaultDir();
  const path = await save({
    title: '另存为归档',
    defaultPath: dir ? `${dir}\\${exportFileName(name, 'fairlens')}` : exportFileName(name, 'fairlens'),
    filters: [{ name: 'FairLens 归档', extensions: ['fairlens'] }],
  });
  if (!path) return null;
  try {
    await invoke('save_archive', { path, json: JSON.stringify(payload, null, 2) });
    return { ok: true, path };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** 打开文件所在目录（导出成功后的可点提示；失败静默，不打断用户） */
export async function revealInFolder(filePath: string): Promise<void> {
  try {
    const dir = filePath.replace(/[\\/][^\\/]+$/, '');
    await openPath(dir || filePath);
  } catch {
    /* 打不开目录不算错误 */
  }
}