//! 导出与归档文件落盘（2026-11-13，#125）。
//!
//! PDF：走 WebView2 的 `ICoreWebView2_7::PrintToPdf(path, settings, handler)`——**无打印对话框**，
//! 直接写文件（`window.print()` 会弹系统对话框，不符合"导出是下载到本地"的要求）。
//! 打印范围是整页，所以前端必须用 `@media print` 隐藏应用 chrome（print-shell.ts）。
//!
//! 归档：前端已序列化好 `FairlensFile` JSON，这里只 `fs::write`——Rust 不碰业务数据。
//!
//! 红线（docs/01 §2.3）：本文件只做"把 WebView2 的打印能力暴露成一个命令"和"写文件"，
//! 不含任何业务逻辑；行数计入 Rust 薄层 <300 行预算。

/// A4（英寸）：8.27 × 11.69。版心交给模板 printCSS（@page margin:0 + 纸面自身 padding）。
#[cfg(windows)]
const A4_W_IN: f64 = 8.27;
#[cfg(windows)]
const A4_H_IN: f64 = 11.69;

#[cfg(windows)]
mod print {
    use std::sync::mpsc;
    use std::time::Duration;

    use tauri::Manager;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment6, ICoreWebView2PrintSettings, ICoreWebView2_7,
    };
    use webview2_com::{CoTaskMemPWSTR, PrintToPdfCompletedHandler};
    use windows_core::Interface;

    use super::{A4_H_IN, A4_W_IN};

    /// 发起 PrintToPdf 并等待完成。
    /// `with_webview` 的回调在主线程执行；PrintToPdf 本身异步、完成回调也在主线程，
    /// 所以这里只在主线程"发起"，把结果通过 channel 带回命令线程等待（不阻塞 UI 线程）。
    pub fn to_pdf(app: &tauri::AppHandle, path: &str) -> Result<(), String> {
        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "找不到主窗口".to_string())?;
        let (tx, rx) = mpsc::channel::<Result<(), String>>();
        let path_owned = path.to_string();

        window
            .with_webview(move |platform| {
                let started = (|| -> Result<(), String> {
                    let controller = platform.controller();
                    let core = unsafe { controller.CoreWebView2() }
                        .map_err(|e| format!("取 ICoreWebView2 失败：{e}"))?;
                    // ICoreWebView2_7 起提供 PrintToPdf（WebView2 Runtime 88+）
                    let webview: ICoreWebView2_7 = core.cast().map_err(|e| {
                        format!("当前 WebView2 运行时不支持 PrintToPdf（需 ICoreWebView2_7）：{e}")
                    })?;
                    let env6: ICoreWebView2Environment6 = platform
                        .environment()
                        .cast()
                        .map_err(|e| format!("取 ICoreWebView2Environment6 失败：{e}"))?;
                    let settings: ICoreWebView2PrintSettings =
                        unsafe { env6.CreatePrintSettings() }
                            .map_err(|e| format!("创建打印设置失败：{e}"))?;

                    unsafe {
                        settings.SetPageWidth(A4_W_IN).map_err(|e| e.to_string())?;
                        settings.SetPageHeight(A4_H_IN).map_err(|e| e.to_string())?;
                        // 四边距 0：版心由纸面自身 padding 决定（画布=导出同源）
                        settings.SetMarginTop(0.0).map_err(|e| e.to_string())?;
                        settings.SetMarginBottom(0.0).map_err(|e| e.to_string())?;
                        settings.SetMarginLeft(0.0).map_err(|e| e.to_string())?;
                        settings.SetMarginRight(0.0).map_err(|e| e.to_string())?;
                        // 背景必须打印：分区标题细线/要点墨块依赖背景
                        settings.SetShouldPrintBackgrounds(true).map_err(|e| e.to_string())?;
                        // 页眉页脚（URL/日期）不要——简历里出现 URL 是噪音
                        settings.SetShouldPrintHeaderAndFooter(false).map_err(|e| e.to_string())?;
                    }

                    let tx_cb = tx.clone();
                    let handler = PrintToPdfCompletedHandler::create(Box::new(move |error, result| {
                        let outcome = match (error, result) {
                            (Err(err), _) => Err(format!("PrintToPdf 失败：{err}")),
                            (Ok(()), true) => Ok(()),
                            (Ok(()), false) => Err("PrintToPdf 返回 false（文件未生成）".to_string()),
                        };
                        let _ = tx_cb.send(outcome);
                        Ok(())
                    }));
                    let wide = CoTaskMemPWSTR::from(path_owned.as_str());
                    unsafe {
                        webview
                            .PrintToPdf(*wide.as_ref().as_pcwstr(), &settings, &handler)
                            .map_err(|e| format!("发起 PrintToPdf 失败：{e}"))?;
                    }
                    Ok(())
                })();

                if let Err(err) = started {
                    let _ = tx.send(Err(err));
                }
            })
            .map_err(|e| format!("with_webview 失败：{e}"))?;

        rx.recv_timeout(Duration::from_secs(60))
            .map_err(|_| "导出超时（60 秒未完成）".to_string())?
    }
}

/// 导出 PDF 到指定路径（前端先用 dialog 选路径）。
#[tauri::command]
pub fn export_pdf(app: tauri::AppHandle, path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        print::to_pdf(&app, &path)
    }
    #[cfg(not(windows))]
    {
        let _ = (&app, &path);
        Err("PDF 导出暂仅支持 Windows（macOS 走 WKWebView 打印，见 §9 平台注记）".to_string())
    }
}

/// 写归档文件（JSON 已由前端序列化；Rust 不做业务校验）。
#[tauri::command]
pub fn save_archive(path: String, json: String) -> Result<(), String> {
    std::fs::write(&path, json).map_err(|e| format!("写入失败：{e}"))
}