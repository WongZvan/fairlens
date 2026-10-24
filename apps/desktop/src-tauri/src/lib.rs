//! FairLens Rust 薄层（红线 <300 行，docs/01 §2.3/附录 A）
//! M0 骨架：log + single-instance；后续里程碑按 Cargo.toml 注释解锁插件，
//! invoke 命令清单见 docs/01 附录 A（snake_case）。

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 二次启动：聚焦既有窗口（文件参数转发=M5 文件关联时接入）
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .run(tauri::generate_context!())
        .expect("error while running fairlens");
}
