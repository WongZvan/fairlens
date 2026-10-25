//! SQLite 迁移定义（m1.6）：user_version 顺序迁移（防腐规则③，docs/01 §2.4）。
//! DDL 唯一事实源=docs/01 附录 B；本文件按迁移版本逐条落地，禁止凭记忆增删列。

use tauri_plugin_sql::{Migration, MigrationKind};

/// Migration 未实现 Clone，无法从 const slice to_vec——按调用构造返回
pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        kind: MigrationKind::Up,
        sql: r#"
CREATE TABLE resumes(id TEXT PRIMARY KEY, title TEXT NOT NULL, vertical_id TEXT NOT NULL DEFAULT 'general',
  template_id TEXT NOT NULL, doc_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX idx_resumes_updated ON resumes(updated_at DESC);
CREATE TABLE resume_snapshots(id TEXT PRIMARY KEY, resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  doc_json TEXT NOT NULL, template_id TEXT NOT NULL, label TEXT,
  trigger TEXT NOT NULL CHECK(trigger IN('ai-accept','manual','pre-eval')), created_at TEXT NOT NULL);
CREATE INDEX idx_snapshots_resume ON resume_snapshots(resume_id, created_at DESC);
CREATE TABLE review_sessions(id TEXT PRIMARY KEY, resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK(source IN('evaluation','walkthrough')), report_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX idx_reviews_resume ON review_sessions(resume_id, created_at DESC);
CREATE TABLE ai_patch_log(id TEXT PRIMARY KEY, resume_id TEXT NOT NULL, block_id TEXT NOT NULL, action TEXT NOT NULL,
  prompt_version INTEGER NOT NULL, model TEXT NOT NULL, original_text TEXT NOT NULL, suggested_text TEXT NOT NULL,
  accepted INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX idx_patch_resume ON ai_patch_log(resume_id, created_at DESC);
CREATE TABLE settings(key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
"#,
    }]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 迁移清单结构守门：版本从 1 连续递增；SQL 建齐附录 B 五表三索引。
    #[test]
    fn migrations_are_sequential_and_cover_initial_ddl() {
        let migrations = migrations();
        assert!(!migrations.is_empty());
        for (i, m) in migrations.iter().enumerate() {
            assert_eq!(m.version, (i + 1) as i64, "迁移版本必须从 1 连续递增");
            assert!(!m.sql.trim().is_empty());
        }
        let all = migrations.iter().map(|m| m.sql).collect::<Vec<_>>().join("\n");
        for table in ["resumes", "resume_snapshots", "review_sessions", "ai_patch_log", "settings"] {
            assert!(all.contains(&format!("CREATE TABLE {table}(")), "缺表：{table}");
        }
        for index in ["idx_resumes_updated", "idx_snapshots_resume", "idx_reviews_resume", "idx_patch_resume"] {
            assert!(all.contains(&format!("CREATE INDEX {index}")), "缺索引：{index}");
        }
    }
}
