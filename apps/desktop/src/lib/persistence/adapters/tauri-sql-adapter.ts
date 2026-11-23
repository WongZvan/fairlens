import Database from '@tauri-apps/plugin-sql';
import type { PersistencePort } from '@fairlens/core';
import { ResumeRow, SnapshotRow, type ResumeRow as ResumeRowT, type SnapshotRow as SnapshotRowT } from '@fairlens/shared';
import { repairResumeDoc } from '../repair-doc.js';

/**
 * tauri-plugin-sql 适配（生产路径）。
 * 连接串必须与 Rust 侧 add_migrations 的 key 逐字一致（lib.rs，dev 库独立=环境分离 #36）。
 */
const DB_URL = import.meta.env.DEV ? 'sqlite:fairlens_dev.db' : 'sqlite:fairlens.db';

let dbPromise: Promise<Database> | null = null;
let fkChecked = false;
/**
 * sqlx 0.8.6 默认 `foreign_keys=ON`（源码注释在 sqlx-sqlite/src/options/mod.rs）；
 * 删除简历依赖它做四表级联（#129）。这里显式断言，不成立就报错而不是静默留孤儿。
 */
const db = async (): Promise<Database> => {
  const database = await (dbPromise ??= Database.load(DB_URL));
  if (!fkChecked) {
    const rows = await database.select<Array<Record<string, unknown>>>('PRAGMA foreign_keys');
    const on = Number(rows[0]?.foreign_keys ?? 0) === 1;
    if (!on) throw new Error('SQLite 外键未启用：删除简历将无法级联子表（#129）');
    fkChecked = true;
  }
  return database;
};

type DbRecord = Record<string, unknown>;

const resumeFromDb = (r: DbRecord): ResumeRowT => {
  // 旧数据修复（#109）：早期版本存过 runs=[] 的 bullet，直接 zod 会整行拒绝 → 编辑器空白
  const doc = repairResumeDoc(JSON.parse(r.doc_json as string));
  if (!doc) throw new Error(`resume ${String(r.id)}: doc_json 无法修复（结构无法识别）`);
  return ResumeRow.parse({
    id: r.id,
    title: r.title,
    verticalId: r.vertical_id,
    status: r.status,
    doc,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
};

const snapshotFromDb = (r: DbRecord): SnapshotRowT => {
  const doc = repairResumeDoc(JSON.parse(r.doc_json as string));
  if (!doc) throw new Error(`snapshot ${String(r.id)}: doc_json 无法修复`);
  return SnapshotRow.parse({
    id: r.id,
    resumeId: r.resume_id,
    doc,
    label: r.label ?? undefined,
    trigger: r.trigger,
    createdAt: r.created_at,
  });
};

export function createTauriSqlAdapter(): PersistencePort {
  return {
    async listResumeMetas() {
      // #129：返回全部状态（归档筛选交 UI）；带 template_id 与快照数，避免卡片 N+1 查询
      const rows = await (await db()).select<DbRecord[]>(
        `SELECT r.id, r.title, r.vertical_id, r.status, r.updated_at, r.template_id,
           (SELECT COUNT(*) FROM resume_snapshots s WHERE s.resume_id = r.id) AS snapshot_count
         FROM resumes r ORDER BY r.updated_at DESC`,
      );
      return rows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        verticalId: r.vertical_id as string,
        status: r.status as 'active' | 'archived',
        updatedAt: r.updated_at as string,
        templateId: r.template_id as string,
        snapshotCount: Number(r.snapshot_count ?? 0),
      }));
    },

    async getResume(id) {
      const rows = await (await db()).select<DbRecord[]>('SELECT * FROM resumes WHERE id = $1', [id]);
      if (!rows[0]) return null;
      const row = resumeFromDb(rows[0]);
      // 自愈写回（#109）：修复过旧数据则落库，避免每次加载重复修复、也让库本身收敛
      try {
        const raw = JSON.parse(rows[0].doc_json as string);
        if (JSON.stringify(raw) !== JSON.stringify(row.doc)) {
          await (await db()).execute(
            `UPDATE resumes SET doc_json = $2, template_id = $3, updated_at = $4 WHERE id = $1`,
            [row.id, JSON.stringify(row.doc), row.doc.templateId, row.updatedAt],
          );
        }
      } catch (err) {
        console.warn('[persistence] 修复回写失败（不影响本次加载）', err);
      }
      return row;
    },

    async upsertResume(row) {
      await (await db()).execute(
        `INSERT INTO resumes(id, title, vertical_id, template_id, doc_json, status, created_at, updated_at)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO UPDATE SET title = $2, vertical_id = $3, template_id = $4, doc_json = $5, status = $6, updated_at = $8`,
        [row.id, row.title, row.verticalId, row.doc.templateId, JSON.stringify(row.doc), row.status, row.createdAt, row.updatedAt],
      );
    },

    async deleteResume(id) {
      await (await db()).execute('DELETE FROM resumes WHERE id = $1', [id]);
    },

    async listSnapshots(resumeId) {
      const rows = await (await db()).select<DbRecord[]>(
        'SELECT * FROM resume_snapshots WHERE resume_id = $1 ORDER BY created_at DESC',
        [resumeId],
      );
      return rows.map(snapshotFromDb);
    },

    async insertSnapshot(row) {
      await (await db()).execute(
        `INSERT INTO resume_snapshots(id, resume_id, doc_json, template_id, label, trigger, created_at)
         VALUES($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, row.resumeId, JSON.stringify(row.doc), row.doc.templateId, row.label ?? null, row.trigger, row.createdAt],
      );
    },

    async getSettingRaw(key) {
      const rows = await (await db()).select<DbRecord[]>('SELECT value_json FROM settings WHERE key = $1', [key]);
      return rows[0] ? JSON.parse(rows[0].value_json as string) : undefined;
    },

    async setSettingRaw(key, value) {
      await (await db()).execute(
        `INSERT INTO settings(key, value_json) VALUES($1, $2)
         ON CONFLICT(key) DO UPDATE SET value_json = $2`,
        [key, JSON.stringify(value)],
      );
    },

    async deleteSetting(key) {
      await (await db()).execute('DELETE FROM settings WHERE key = $1', [key]);
    },
  };
}
