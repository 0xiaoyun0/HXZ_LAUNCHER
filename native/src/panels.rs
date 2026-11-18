use crate::worker::Engine;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{atomic::Ordering, Arc, Mutex},
};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

struct Inner {
    lyrics: Value,
    community: Value,
    options: Value,
    shortcuts: Value,
    failures: Vec<String>,
    capture: bool,
    auto_hidden: bool,
}
pub struct Panels {
    inner: Mutex<Inner>,
    file: PathBuf,
    registration: Mutex<()>,
}
impl Panels {
    pub fn new(home: &Path) -> Self {
        let file = home.join("desktop-panels.json");
        let options = fs::read(&file)
            .ok()
            .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
            .filter(Value::is_object)
            .unwrap_or(json!({}));
        Self {
            file,
            registration: Mutex::new(()),
            inner: Mutex::new(Inner {
                lyrics: json!({}),
                community: json!({}),
                options,
                shortcuts: json!({}),
                failures: Vec::new(),
                capture: false,
                auto_hidden: false,
            }),
        }
    }
    fn state(&self, kind: &str) -> Value {
        let s = self.inner.lock().unwrap();
        if kind == "lyrics" {
            let mut value = s.lyrics.clone();
            value["visible"] = json!(s.lyrics["visible"] == true);
            value["locked"] = json!(s.options["locked"] == true);
            value["keepPlayingOnClose"] = json!(s.options["keepPlayingOnClose"] == true);
            value
        } else {
            s.community.clone()
        }
    }
    pub fn playing_on_close(&self) -> bool {
        let s = self.inner.lock().unwrap();
        s.options["keepPlayingOnClose"] == true
            && s.lyrics["visible"] == true
            && s.lyrics["playing"] == true
    }
    pub fn auto_window(&self, app: &AppHandle, action: &str) {
        let Some(w) = app.get_webview_window("main") else {
            return;
        };
        let mut s = self.inner.lock().unwrap();
        match action {
            "hide" | "minimize" => {
                if !s.auto_hidden {
                    s.auto_hidden = if action == "hide" {
                        w.hide()
                    } else {
                        w.minimize()
                    }
                    .is_ok();
                }
            }
            "restore" => {
                if s.auto_hidden {
                    s.auto_hidden = false;
                    let _ = w.show();
                    let _ = w.unminimize();
                }
            }
            _ => {}
        }
    }
    fn draw(&self, app: &AppHandle, kind: &str, visible: bool) -> Result<(), String> {
        let existing = app.get_webview_window(kind);
        if !visible {
            if let Some(w) = existing {
                w.hide().map_err(|e| e.to_string())?;
            }
            return Ok(());
        }
        let value = self.state(kind);
        let window = if let Some(w) = existing {
            w
        } else {
            let (width, height, title) = match kind {
                "lyrics" => (510., 130., "幻想镇 · 桌面歌词"),
                "voice" => (260., 102., "幻想镇 · 语音"),
                "chat" => (400., 370., "幻想镇 · 游戏内聊天"),
                _ => return Err("未知面板".into()),
            };
            WebviewWindowBuilder::new(app, kind, WebviewUrl::App("panels/index.html".into()))
                .title(title)
                .inner_size(width, height)
                .min_inner_size(200., 75.)
                .always_on_top(true)
                .skip_taskbar(true)
                .decorations(false)
                .focused(false)
                .visible(false)
                .center()
                .build()
                .map_err(|e| e.to_string())?
        };
        if kind == "lyrics" {
            window
                .set_ignore_cursor_events(value["locked"] == true)
                .map_err(|e| e.to_string())?;
        }
        window
            .emit("panel-update", &value)
            .map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        if kind == "chat" {
            window.set_focus().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    fn configure_lyrics(&self, app: &AppHandle, input: &Value) -> Result<Value, String> {
        {
            let mut s = self.inner.lock().unwrap();
            let mut options = s.options.clone();
            for key in ["locked", "keepPlayingOnClose"] {
                if let Some(v) = input.get(key) {
                    options[key] = json!(v.as_bool().ok_or("无效歌词设置")?);
                }
            }
            let tmp = self.file.with_extension("tmp");
            fs::write(&tmp, serde_json::to_vec(&options).unwrap())
                .and_then(|_| fs::rename(tmp, &self.file))
                .map_err(|e| e.to_string())?;
            s.options = options;
        }
        let value = self.state("lyrics");
        self.draw(app, "lyrics", value["visible"] == true)?;
        let _ = app.emit_to(
            "main",
            "engine-event",
            with_type(value.clone(), "desktop-lyrics-state"),
        );
        Ok(value)
    }
    fn register(&self, app: &AppHandle) -> Result<Value, String> {
        let _serial = self.registration.lock().unwrap();
        let api = app.global_shortcut();
        api.unregister_all().map_err(|e| e.to_string())?;
        let cfg = {
            let s = self.inner.lock().unwrap();
            if s.capture {
                Value::Null
            } else {
                s.shortcuts.clone()
            }
        };
        let mut failures = Vec::new();
        if cfg["enabled"] == true {
            for key in ["chat", "leaveVoice", "stopMusic", "hideLyrics"] {
                let Some(combo) = cfg["keys"][key]
                    .as_str()
                    .filter(|v| !v.is_empty() && v.len() < 81)
                else {
                    continue;
                };
                let result = api.on_shortcut(combo, move |app, _, e| {
                    if e.state != ShortcutState::Pressed
                        || !app
                            .state::<Arc<Engine>>()
                            .authenticated
                            .load(Ordering::Acquire)
                    {
                        return;
                    }
                    if key == "chat" {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let p = app.state::<Panels>();
                            let visible = app
                                .get_webview_window("chat")
                                .and_then(|w| w.is_visible().ok())
                                .unwrap_or(false);
                            let _ = p.draw(&app, "chat", !visible);
                        });
                    } else {
                        let _ = app.emit_to(
                            "main",
                            "engine-event",
                            json!({"type":"companion-action","action":key}),
                        );
                    }
                });
                if result.is_err() {
                    failures.push(combo.to_string());
                }
            }
        }
        self.inner.lock().unwrap().failures = failures.clone();
        Ok(json!({"failed":failures}))
    }
    pub fn action(&self, app: &AppHandle, name: &str, input: &Value) -> Result<Value, String> {
        match name {
            "lyrics.status" => Ok(self.state("lyrics")),
            "lyrics.configure" => self.configure_lyrics(app, input),
            "lyrics.update" => {
                let mut lyric =
                    json!({"playing":input["playing"]==true,"visible":input["visible"]==true});
                for key in ["text", "translation", "title"] {
                    lyric[key] = json!(input[key]
                        .as_str()
                        .unwrap_or("")
                        .chars()
                        .take(500)
                        .collect::<String>());
                }
                let visible = lyric["visible"] == true;
                self.inner.lock().unwrap().lyrics = lyric;
                self.draw(app, "lyrics", visible)?;
                Ok(Value::Null)
            }
            "companion.configure" => {
                self.inner.lock().unwrap().shortcuts = input.clone();
                self.register(app)
            }
            "companion.capture" => {
                self.inner.lock().unwrap().capture = input["active"] == true;
                self.register(app)
            }
            "companion.status" => Ok(json!({"failed":self.inner.lock().unwrap().failures})),
            "companion.sync" => {
                if input.to_string().len() > 256 * 1024 {
                    return Err("面板数据过大".into());
                }
                self.inner.lock().unwrap().community = input.clone();
                let show = input["voiceOverlay"] == true && input["joined"] == true;
                self.draw(app, "voice", show)?;
                if let Some(w) = app.get_webview_window("chat") {
                    let _ = w.emit("panel-update", input);
                }
                Ok(Value::Null)
            }
            _ => Err("未知面板操作".into()),
        }
    }
}
fn with_type(mut value: Value, kind: &str) -> Value {
    value["type"] = json!(kind);
    value
}
#[tauri::command]
pub async fn panel_request(
    window: WebviewWindow,
    panels: State<'_, Panels>,
    engine: State<'_, Arc<Engine>>,
    action: String,
    input: Value,
) -> Result<Value, String> {
    let name = window.label();
    let url = window.url().map_err(|e| e.to_string())?;
    if !matches!(name, "chat" | "voice" | "lyrics")
        || url.host_str() != Some("tauri.localhost")
        || url.path() != "/panels/index.html"
    {
        return Err("未知面板".into());
    }
    let app = window.app_handle();
    if name != "lyrics" && !engine.authenticated.load(Ordering::Acquire) {
        return Err("请先登录".into());
    }
    if action == "state" {
        return Ok(json!({"kind":name,"state":panels.state(name)}));
    }
    match (name, action.as_str()) {
        ("lyrics", "lock") => panels.configure_lyrics(app, &json!({"locked":true})),
        ("lyrics", "hide") => {
            let mut s = panels.inner.lock().unwrap();
            s.lyrics["visible"] = json!(false);
            drop(s);
            window.hide().map_err(|e| e.to_string())?;
            app.emit_to(
                "main",
                "engine-event",
                with_type(panels.state(name), "desktop-lyrics-state"),
            )
            .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        ("lyrics", "toggle" | "previous" | "next") => {
            app.emit_to(
                "main",
                "engine-event",
                json!({"type":"lyrics-control","action":action}),
            )
            .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        ("chat", "send") => {
            let body = input["body"]
                .as_str()
                .filter(|s| !s.trim().is_empty() && s.chars().count() <= 1000)
                .ok_or("消息长度无效")?;
            app.emit_to(
                "main",
                "engine-event",
                json!({"type":"companion-action","action":"sendChat","body":body}),
            )
            .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        ("chat", "hide") => {
            window.hide().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        _ => Err("无效面板操作".into()),
    }
}
pub fn install_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    };
    let show = MenuItem::with_id(app, "open", "打开幻想镇", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, "quit", "退出启动器", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &exit])?;
    let reveal = |app: &AppHandle| {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    };
    let mut tray = TrayIconBuilder::new()
        .tooltip("幻想镇 3rd")
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
