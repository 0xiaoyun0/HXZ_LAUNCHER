use crate::worker::Engine;
use serde_json::json;
use std::sync::{atomic::Ordering, Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct GameWindow(Mutex<bool>);
impl GameWindow {
    pub fn follow(&self, app: &AppHandle, action: &str) {
        let Some(window) = app.get_webview_window("main") else {
            return;
        };
        let mut hidden = self.0.lock().unwrap();
        match action {
            "hide" | "minimize" if !*hidden => {
                *hidden = if action == "hide" {
                    window.hide()
                } else {
                    window.minimize()
                }
                .is_ok();
            }
            "restore" if *hidden => {
                *hidden = false;
                let _ = window.show();
                let _ = window.unminimize();
            }
            _ => {}
        }
    }
}

pub fn install_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    };
    let show = MenuItem::with_id(app, "open", "打开幻想镇", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &exit])?;
    let reveal = |app: &AppHandle| {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    };
    let mut tray = TrayIconBuilder::new()
        .tooltip(app.package_info().name.clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, e| match e.id.as_ref() {
            "open" => reveal(app),
            "quit" => {
                let service = app.state::<Arc<Engine>>();
                if service.games.active() || service.busy.load(Ordering::Acquire) {
                    reveal(app);
                    let _ = app.emit_to("main", "engine-event", json!({"type":"close-busy"}));
                } else {
                    app.exit(0);
                }
            }
            _ => {}
        })
        .on_tray_icon_event(move |tray, e| {
            if matches!(
                e,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                reveal(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}
