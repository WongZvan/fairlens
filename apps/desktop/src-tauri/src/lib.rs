//! FairLens Rust 薄层（红线 <300 行，docs/01 §2.3/附录 A）
//! M0 骨架：log + single-instance；后续里程碑按 Cargo.toml 注释解锁插件，
//! invoke 命令清单见 docs/01 附录 A（snake_case）。

mod db;

use tauri::Manager;
use tauri_plugin_log::log;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 环境分离（#36）：dev 库独立文件，与用户数据隔离
    let db_url = if cfg!(debug_assertions) { "sqlite:fairlens_dev.db" } else { "sqlite:fairlens.db" };
    // 崩溃日志（决策 #43）：stdout + 应用日志目录按天滚动留 7 份；Rust panic 与前端 error 双捕获
    let log_plugin = tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: Some("fairlens".into()) }),
        ])
        .level(tauri_plugin_log::log::LevelFilter::Info)
        .level_for("sqlx", tauri_plugin_log::log::LevelFilter::Warn) // sqlx 的 DEBUG 语句刷屏，日志文件只留告警
        .max_file_size(2_000_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(7))
        .build();
    tauri::Builder::default()
        .plugin(log_plugin)
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db_url, db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 二次启动：聚焦既有窗口（文件参数转发=M5 文件关联时接入）
            log::warn!("second instance launched; focusing existing window");
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .setup(|_app| {
            // Rust panic 必须留痕（否则进程静默退出无从定位）
            std::panic::set_hook(Box::new(|info| {
                log::error!("PANIC: {info}");
                eprintln!("PANIC: {info}");
            }));
            log::info!(
                "FairLens starting v{} ({} profile)",
                env!("CARGO_PKG_VERSION"),
                if cfg!(debug_assertions) { "dev" } else { "release" }
            );
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                log::info!("main window close requested");
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building fairlens")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                log::info!("FairLens exiting (event loop ended)");
            }
        });
}
