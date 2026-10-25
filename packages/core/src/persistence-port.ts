import type { ResumeRow, SettingKey, SnapshotRow } from '@fairlens/shared';

/**
 * 持久层端口（core 定义接口，desktop 实现适配器）：
 * - TauriSqlAdapter：tauri-plugin-sql（生产/真机）
 * - MemoryAdapter：内存实现（浏览器 dev 调试/单测）
 * doc_json 的序列化/反序列化归属 adapter 层（core 契约保持结构化）。
 */
export interface PersistencePort {
  // resumes
  listResumeMetas(): Promise<Array<Pick<ResumeRow, 'id' | 'title' | 'verticalId' | 'status' | 'updatedAt'>>>;
  getResume(id: string): Promise<ResumeRow | null>;
  upsertResume(row: ResumeRow): Promise<void>;
  deleteResume(id: string): Promise<void>;

  // resume_snapshots（created_at DESC）
  listSnapshots(resumeId: string): Promise<SnapshotRow[]>;
  insertSnapshot(row: SnapshotRow): Promise<void>;

  // settings（value_json 由 adapter 序列化；undefined=未设置→调用方回落默认）
  getSettingRaw(key: SettingKey): Promise<unknown>;
  setSettingRaw(key: SettingKey, value: unknown): Promise<void>;
}
