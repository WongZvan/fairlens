/**
 * 文档统计（2026-11-13，#124）：状态栏「约 N 字 · M 条要点」。
 *
 * 计数口径（写死便于单测）：
 * - 字数 = 所有 bullet 的 run 文本拼接后，**排除空白字符**的字符数
 *   （简历场景关心"写了多少字"，空格/换行不算；与 Word 的"字符数（不计空格）"同义）
 * - 要点数 = 有文本的 bullet 数
 * - 条目数 = entries 数（含只有条头没有要点的）
 *
 * 不含页头 profile 与基本信息字段——那些是标识信息，计入字数会误导"我写了多少"。
 */
import type { ResumeDoc } from '@fairlens/shared';

export interface DocStats {
  /** 不计空白的字符数 */
  chars: number;
  /** 要点条数（有文本的 bullet） */
  bullets: number;
  /** 条目数（含无要点的空壳） */
  entries: number;
}

export function docStats(doc: ResumeDoc | null | undefined): DocStats {
  if (!doc) return { chars: 0, bullets: 0, entries: 0 };
  let chars = 0;
  let bullets = 0;
  let entries = 0;
  for (const section of doc.sections) {
    for (const entry of section.entries) {
      entries += 1;
      for (const bullet of entry.bullets) {
        const text = bullet.runs.map((run) => run.text).join('');
        if (!text.trim()) continue; // 空 bullet（序列化本该已丢弃，防御旧数据）
        bullets += 1;
        chars += text.replace(/\s/g, '').length;
      }
    }
  }
  return { chars, bullets, entries };
}

/** 千分位（状态栏显示用；纯函数便于单测） */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}