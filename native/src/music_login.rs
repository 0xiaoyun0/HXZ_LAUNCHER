use crate::worker::Engine;
use serde_json::{json, Value};
use tauri::{webview::NewWindowResponse, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn action(
    app: &AppHandle,
    engine: &Engine,
    action: &str,
    input: &Value,
) -> Result<Value, String> {
    let id = input["profile"]
        .as_str()
        .filter(|s| s.len() == 32 && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or("音乐账号标识无效")?;
    let directory = engine.home.join("music-accounts").join(id);
    let label = format!("music-id-{id}");
    let origin = url::Url::parse("https://music.163.com/").unwrap();
    let existing = app.get_webview_window(&label);
    if action != "music.web.login" && existing.is_none() && !directory.is_dir() {
        return Ok(json!([]));
    }
    let window = match existing {
        Some(w) => w,
        None => {
            let url = if action == "music.web.login" {
                origin.join("#/my").unwrap()
            } else {
                url::Url::parse("about:blank").unwrap()
            };
            WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url))
                .title("网易云音乐 · 个人账号")
                .inner_size(940., 700.)
                .data_directory(directory)
                .visible(false)
                .on_navigation(|u| {
                    u.as_str() == "about:blank"
                        || (u.scheme() == "https"
                            && matches!(
                                u.host_str(),
                                Some(
                                    "music.163.com"
                                        | "y.music.163.com"
                                        | "reg.163.com"
                                        | "dl.reg.163.com"
                                )
                            ))
                })
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .build()
                .map_err(|e| e.to_string())?
        }
    };
    match action {
        "music.web.login" => {
            window
                .navigate(origin.join("#/my").unwrap())
                .and_then(|_| window.show())
                .and_then(|_| window.set_focus())
                .map_err(|e| e.to_string())?;
            Ok(json!({"opened":true}))
        }
        "music.web.cookies" => {
            let cookies = window.cookies_for_url(origin).map_err(|e| e.to_string())?;
            Ok(json!(cookies
                .into_iter()
                .filter(|c| matches!(c.name(), "MUSIC_U" | "__csrf" | "MUSIC_A" | "NMTID"))
                .map(|c| json!([c.name(), c.value()]))
                .collect::<Vec<_>>()))
        }
        "music.web.logout" => {
            window
                .clear_all_browsing_data()
                .and_then(|_| window.close())
                .map_err(|e| e.to_string())?;
            Ok(json!([]))
        }
        _ => Err("无效音乐操作".into()),
    }
}
