/**
 * 文档等价判定（2026-11-13，反馈缺陷修复）：dirty 必须是「当前文档 ≠ 上次保存文档」，
 * 而不是「发生过编辑事件」的闩锁——否则新建要点再删掉、文档回到原样时，
 * 关闭仍会弹三键框（用户实测报障）。
 *
 * 为什么不用 JSON.stringify 直接比：对象键序取决于构造路径（zod 解析 vs PM 序列化 vs
 * 从库反序列化可能不同），键序不同会误判为「已改动」。此处先规范化（对象键排序、
 * 数组保序），再做字符串比较。文档是纯数据（无 undefined/函数/Date），无需通用深比较库。
 */

/** 递归规范化：对象键升序、数组保持原序、undefined 键丢弃（与 JSON 语义一致） */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonical(v);
    }
    return out;
  }
  return value;
}

/** 规范化 JSON 串（可用于比较/日志；键序稳定） */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonical(value));
}

/** 两份文档内容是否等价（键序无关） */
export function sameDoc(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  return canonicalJson(a) === canonicalJson(b);
}