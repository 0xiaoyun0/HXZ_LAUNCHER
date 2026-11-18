#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod access;
mod host;
mod library;
mod media;
mod music_login;
mod panels;
mod processes;
mod vault;
mod worker;

use serde_json::{json, Value};
use std::{
    path::PathBuf,
    sync::{atomic::Ordering, Arc},
};
use tauri::{DragDropEvent, Emitter, Manager, State, WebviewWindow, WindowEvent};
use worker::Engine;

struct Invitations(std::sync::Mutex<Option<String>>);
fn invite(value: &str) -> Option<String> {
    if value.len() > 8192 {
        return None;
    }
    let url = url::Url::parse(value).ok()?;
    if !matches!(url.scheme(), "hxz-room" | "hxz3-room")
        || url.host_str() != Some("join")
        || url.query().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return None;
    }
    let code = url.path().strip_prefix('/')?;
    if code.is_empty()
        || !code
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
    {
        return None;
    }
    Some(format!("hxz-room://join/{code}"))
}
#[tauri::command]
async fn launcher_request(
    window: WebviewWindow,
    engine: State<'_, Arc<Engine>>,
    action: String,
    input: Value,
) -> Result<Value, String> {
    let url = window.url().map_err(|e| e.to_string())?;
    let local = url.host_str() == Some("tauri.localhost")
        || (cfg!(debug_assertions)
            && url.host_str() == Some("127.0.0.1")
            && url.port() == Some(5178));
    if window.label() != "main"
        || !local
        || action.len() > 96
        || !action
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-')
    {
        return Err("请求来源或操作无效".into());
    }
    if !engine.authenticated.load(Ordering::Acquire) && !access::guest(&action) {
        return Err("请先登录幻想镇账号".into());
    }
    if input.to_string().len() > 13 * 1024 * 1024 {
        return Err("请求过大".into());
    }
    if action == "lobby.invitation.take" {
        return Ok(json!(window
            .state::<Invitations>()
            .0
            .lock()
            .unwrap()
            .take()));
    }
    if action.starts_with("lyrics.") || action.starts_with("companion.") {
        return window.app_handle().state::<panels::Panels>().action(
            window.app_handle(),
            &action,
            &input,
        );
    }
    if action == "window.sleep" || action == "memory.compact" {
        use webview2_com::Microsoft::Web::WebView2::Win32::{
            ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
        };
        use windows_core::Interface;
        let low = action == "memory.compact" || input["enabled"] == true;
        let (send, recv) = std::sync::mpsc::channel();
        window
            .with_webview(move |wv| {
                let result = unsafe {
                    wv.controller()
                        .CoreWebView2()
                        .and_then(|c| c.cast::<ICoreWebView2_19>())
                        .and_then(|c| {
                            c.SetMemoryUsageTargetLevel(if low {
                                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW
                            } else {
                                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL
                            })
                        })
                };
                let _ = send.send(result.map_err(|e| e.to_string()));
            })
            .map_err(|e| e.to_string())?;
        recv.recv_timeout(std::time::Duration::from_secs(5))
            .map_err(|_| "WebView2 内存设置超时".to_string())??;
        if action == "memory.compact" {
            *engine.library.lock().unwrap() = Default::default();
        }
        return Ok(json!({"lowMemory":low}));
    }
    if action == "window.control" {
        match input["action"].as_str() {
            Some("minimize") => window.minimize(),
            Some("maximize") => {
                if window.is_maximized().unwrap_or(false) {
                    window.unmaximize()
                } else {
                    window.maximize()
                }
            }
            Some("close") => window.close(),
            _ => return Err("未知窗口操作".into()),
        }
        .map_err(|e| e.to_string())?;
        return Ok(Value::Null);
    }
    let app = window.app_handle().clone();
    let service = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || service.request(&app, action, input))
        .await
        .map_err(|e| e.to_string())?
}
fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            if let Some(link) = args.iter().find_map(|value| invite(value)) {
                if let Some(pending) = app.try_state::<Invitations>() {
                    *pending.0.lock().unwrap() = Some(link);
                }
                let _ = app.emit_to("main", "engine-event", json!({"type":"room-link"}));
            }
        }))
        .register_uri_scheme_protocol("hxz-media", |ctx, req| {
            let engine = ctx.app_handle().state::<Arc<Engine>>();
            media::response(&engine.home, &req)
        })
        .setup(|app| {
            let home = std::env::var_os("HXZ3_HOME")
                .map(PathBuf::from)
                .unwrap_or(app.path().app_local_data_dir()?);
            let bin = std::env::current_exe()?
                .parent()
                .ok_or("找不到程序目录")?
                .join("engine");
            std::fs::create_dir_all(&home)?;
            app.manage(Invitations(std::sync::Mutex::new(
                std::env::args().skip(1).find_map(|v| invite(&v)),
            )));
            app.manage(panels::Panels::new(&home));
            app.manage(Engine::new(home, bin)?);
            panels::install_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            launcher_request,
            panels::panel_request
        ])
        .on_window_event(|w, event| {
            if w.label() != "main" {
                return;
            }
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = event {
                if let Some(file) = paths.first().filter(|p| {
                    p.extension().and_then(|s| s.to_str()).is_some_and(|ext| {
                        matches!(ext.to_ascii_lowercase().as_str(), "zip" | "mrpack")
                    })
                }) {
                    let _ = w.emit("engine-event", json!({"type":"pack-drop","file":file}));
                }
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                if w.state::<panels::Panels>().playing_on_close() {
                    api.prevent_close();
                    let _ = w.hide();
                    return;
                }
                let service = w.state::<Arc<Engine>>();
                if service.busy.load(Ordering::Acquire) || service.games.active() {
                    api.prevent_close();
                    let _ = w.minimize();
                    let _ = w.emit("engine-event", json!({"type":"close-busy"}));
                } else {
                    w.app_handle().exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("无法初始化幻想镇窗口");
    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            handle.state::<Arc<Engine>>().shutdown();
        }
    });
}

#[test]
fn room_links_keep_protocol_compatibility() {
    assert_eq!(
        invite("hxz3-room://join/a-Z0_"),
        Some("hxz-room://join/a-Z0_".into())
    );
    assert!(invite("hxz-room://unrelated/a").is_none());
    assert!(invite("https://join/a").is_none());
}
