import type { PersistencePort } from '@fairlens/core';
import type { ResumeRow, SettingKey, SnapshotRow } from '@fairlens/shared';

/** 内存实现：浏览器 dev 调试用（web 模式不受阻——STATE 环境实录）；数据生命周期=页面会话 */
export function createMemoryAdapter(): PersistencePort {
  const resumes = new Map<string, ResumeRow>();
  const snapshots = new Map<string, SnapshotRow[]>();
  const settings = new Map<SettingKey, unknown>();

  return {
    async listResumeMetas() {
      return [...resumes.values()]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ id, title, verticalId, status, updatedAt, doc }) => ({
          id,
          title,
          verticalId,
          status,
          updatedAt,
          templateId: doc.templateId,
          snapshotCount: snapshots.get(id)?.length ?? 0,
        }));
    },
    async getResume(id) {
      return resumes.get(id) ?? null;
    },
    async upsertResume(row) {
      resumes.set(row.id, structuredClone(row));
    },
    async deleteResume(id) {
      resumes.delete(id);
      // #129：与 SQLite 的 ON DELETE CASCADE 对齐——快照必须一起清，不能留孤儿
      snapshots.delete(id);
    },
    async listSnapshots(resumeId) {
      return [...(snapshots.get(resumeId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async insertSnapshot(row) {
      const list = snapshots.get(row.resumeId) ?? [];
      list.push(structuredClone(row));
      snapshots.set(row.resumeId, list);
    },
    async getSettingRaw(key) {
      return settings.has(key) ? settings.get(key) : undefined;
    },
    async setSettingRaw(key, value) {
      settings.set(key, structuredClone(value));
    },
    async deleteSetting(key) {
      settings.delete(key);
    },
  };
}
