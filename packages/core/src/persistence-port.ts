import type { ResumeRow, SettingKey, SnapshotRow } from '@fairlens/shared';

/** 简历库卡片所需的轻量元信息（不加载 doc_json；#129） */
export interface ResumeMeta extends Pick<ResumeRow, 'id' | 'title' | 'verticalId' | 'status' | 'updatedAt'> {
  /** 来源 doc.templateId（SQL 读 template_id 列） */
  templateId: string;
  /** 快照数（删除确认与卡片元信息用） */
  snapshotCount: number;
}

/**
 * 持久层端口（core 定义接口，desktop 实现适配器）：
 * - TauriSqlAdapter：tauri-plugin-sql（生产/真机）
 * - MemoryAdapter：内存实现（浏览器 dev 调试/单测）
 * doc_json 的序列化/反序列化归属 adapter 层（core 契约保持结构化）。
 */
export interface PersistencePort {
  // resumes
  /** 返回**全部状态**（active + archived），按 updatedAt 倒序；归档筛选由 UI 负责 */
  listResumeMetas(): Promise<ResumeMeta[]>;
  getResume(id: string): Promise<ResumeRow | null>;
  upsertResume(row: ResumeRow): Promise<void>;
  deleteResume(id: string): Promise<void>;

  // resume_snapshots（created_at DESC）
  listSnapshots(resumeId: string): Promise<SnapshotRow[]>;
  insertSnapshot(row: SnapshotRow): Promise<void>;

  // settings（value_json 由 adapter 序列化；undefined=未设置→调用方回落默认）
  getSettingRaw(key: SettingKey): Promise<unknown>;
  setSettingRaw(key: SettingKey, value: unknown): Promise<void>;
  /** 清除设置键（#113：重置激活记忆） */
  deleteSetting(key: SettingKey): Promise<void>;
}
