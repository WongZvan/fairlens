/**
 * 导出前完整性判定（#128）：姓名未填写时不允许导出。
 *
 * 空白简历在数据层保持 `profile.name = ''`（不编造「你的姓名」），
 * 画布用占位文案显示；导出口在此统一拦截并提示，PDF 与归档共用。
 */
export function isNameMissing(name: string | undefined | null): boolean {
  return !(name ?? '').trim();
}
