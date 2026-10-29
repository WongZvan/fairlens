import { ResumeDoc } from '@fairlens/shared';

/**
 * 旧数据修复（#109）：早期版本把画布删空的 bullet 也序列化进 doc_json（runs=[]，违反契约 min(1)），
 * 这些行现在会被 zod 拒绝并让编辑器整页空白。加载时先修复：丢弃空 runs 的 bullet、剔除非法节点。
 * 纯函数，返回修复后的 doc；无法修复（非对象/无 sections）时返回 null。
 */
export function repairResumeDoc(raw: unknown): ResumeDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const asRecord = raw as Record<string, unknown>;
  if (!Array.isArray(asRecord.sections)) return null;

  const sections = asRecord.sections
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => {
      const entries = Array.isArray(s.entries)
        ? (s.entries as unknown[])
            .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
            .map((e) => {
              const bullets = Array.isArray(e.bullets)
                ? (e.bullets as unknown[])
                    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
                    .filter((b) => Array.isArray(b.runs) && (b.runs as unknown[]).length > 0)
                : [];
              // 早期版本把 'YYYY.MM' 存成数字（2022.09）——契约要求字符串，此处归一为两位小数
              const fixedDates: Record<string, unknown> = {};
              for (const k of ['start', 'end'] as const) {
                const v = e[k];
                if (typeof v === 'number') fixedDates[k] = v.toFixed(2);
              }
              return { ...e, ...fixedDates, bullets };
            })
        : [];
      return { ...s, entries };
    });

  const candidate = { ...asRecord, sections };
  const parsed = ResumeDoc.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
