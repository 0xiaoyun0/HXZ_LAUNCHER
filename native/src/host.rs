use crate::{
    vault,
    worker::{Engine, Wire},
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use rfd::FileDialog;
use serde_json::{json, Value};
use std::{
    io::Cursor,
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{AppHandle, Manager};

fn dialog(options: &Value) -> FileDialog {
    let mut picker = FileDialog::new();
    if let Some(title) = options["title"].as_str() {
        picker = picker.set_title(title);
    }
    if let Some(path) = options["defaultPath"].as_str() {
        let path = Path::new(path);
        if let Some(name) = path.file_name() {
            picker = picker.set_file_name(name.to_string_lossy());
        }
    }
    if let Some(filters) = options["filters"].as_array() {
        for f in filters {
            if let Some(ext) = f["extensions"].as_array() {
                let list: Vec<_> = ext.iter().filter_map(Value::as_str).collect();
                if !list.is_empty() {
                    picker = picker.add_filter(f["name"].as_str().unwrap_or("文件"), &list);
                }
            }
        }
    }
    picker
}
pub fn dispatch(
    app: &AppHandle,
    engine: &Engine,
    wire: &Arc<Wire>,
    action: &str,
    input: &Value,
) -> Result<Value, String> {
    match action {
        "music.web.cookies" | "music.web.login" | "music.web.logout" => {
            crate::music_login::action(app, engine, action, input)
        }
        "update.install" => {
            use sha2::{Digest, Sha256};
            use std::{fs::File, io::Read, process::Command, sync::atomic::Ordering};
            let id = input["sha256"]
                .as_str()
                .filter(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit()))
                .ok_or("无效更新标识")?;
            if engine.busy.load(Ordering::Acquire) || engine.games.active() {
                return Err("请先结束游戏或下载".into());
            }
            let file = engine.home.join("updates").join(format!("{id}.exe"));
            let mut src = File::open(&file).map_err(|e| e.to_string())?;
            let mut digest = Sha256::new();
            let mut buf = [0u8; 65536];
            loop {
                let n = src.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 {
                    break;
                }
                digest.update(&buf[..n]);
            }
            if format!("{:x}", digest.finalize()) != id {
                return Err("安装包校验失败".into());
            }
            Command::new(file).arg("--updated").spawn().map_err(|e| e.to_string())?;
            let app = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(450));
                app.exit(0);
            });
            Ok(Value::Null)
        }
        "library.scan" => engine
            .library
            .lock()
            .unwrap()
            .scan(input["root"].as_str().unwrap_or("")),
        "vault.seal" | "vault.open" => {
            let data = STANDARD
                .decode(input["bytes"].as_str().ok_or("缺少数据")?)
                .map_err(|e| e.to_string())?;
            Ok(json!(
                STANDARD.encode(vault::transform(&data, action == "vault.seal")?)
            ))
        }
        "dialog.open" => {
            let picker = dialog(input);
            let properties = input["properties"].as_array();
            let has = |name: &str| properties.is_some_and(|v| v.iter().any(|p| p == name));
            let paths: Vec<PathBuf> = if has("openDirectory") {
                picker.pick_folder().into_iter().collect()
            } else if has("multiSelections") {
                picker.pick_files().unwrap_or_default()
            } else {
                picker.pick_file().into_iter().collect()
            };
            Ok(json!({"canceled":paths.is_empty(),"filePaths":paths}))
        }
        "dialog.save" => {
            let path = dialog(input).save_file();
            Ok(json!({"canceled":path.is_none(),"filePath":path}))
        }
        "file.open" => {
            let path = Path::new(input["path"].as_str().ok_or("缺少路径")?);
            if !path.is_dir() {
                return Err("只能打开文件夹".into());
            }
            open::that_detached(path).map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "file.reveal" => {
            let path = Path::new(input["path"].as_str().ok_or("缺少路径")?);
            let dir = path.parent().ok_or("找不到所在目录")?;
            open::that_detached(dir).map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "file.trash" => {
            trash::delete(input["path"].as_str().ok_or("缺少路径")?).map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "image.thumbnail" => {
            let path = input["path"].as_str().ok_or("缺少图片")?;
            let mut reader = image::ImageReader::open(path)
                .map_err(|e| e.to_string())?
                .with_guessed_format()
                .map_err(|e| e.to_string())?;
            let mut limits = image::Limits::default();
            limits.max_image_width = Some(16384);
            limits.max_image_height = Some(16384);
            limits.max_alloc = Some(128 * 1024 * 1024);
            reader.limits(limits);
            let original = reader.decode().map_err(|e| e.to_string())?;
            let (width, height) = if input["avatar"] == true {
                let w = input["small"]
                    .as_bool()
                    .map(|small| if small { 64 } else { 96 })
                    .unwrap_or(96);
                (w, w)
            } else {
                (1600, 900)
            };
            let mut bytes = Cursor::new(Vec::new());
            if input["skinHead"] == true {
                skin_head(&original)?.write_to(&mut bytes, image::ImageFormat::Png).map_err(|e| e.to_string())?;
            } else if input["avatar"] == true {
                original
                    .resize_to_fill(width, height, image::imageops::FilterType::Lanczos3)
                    .write_to(&mut bytes, image::ImageFormat::Png)
                    .map_err(|e| e.to_string())?;
            } else {
                image::codecs::jpeg::JpegEncoder::new_with_quality(&mut bytes, 80)
                    .encode_image(&original.thumbnail(width, height))
                    .map_err(|e| e.to_string())?;
            }
            Ok(json!(STANDARD.encode(bytes.into_inner())))
        }
        "url.open" => {
            let link = url::Url::parse(input["url"].as_str().ok_or("缺少网址")?)
                .map_err(|e| e.to_string())?;
            if !matches!(link.scheme(), "http" | "https")
                || !link.username().is_empty()
                || link.password().is_some()
            {
                return Err("无效网页地址".into());
            }
            open::that_detached(link.as_str()).map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window.control" => {
            let w = app.get_webview_window("main").ok_or("窗口已关闭")?;
            match input["action"].as_str() {
                Some("minimize") => w.minimize(),
                Some("maximize") => {
                    if w.is_maximized().unwrap_or(false) {
                        w.unmaximize()
                    } else {
                        w.maximize()
                    }
                }
                Some("close") => w.close(),
                _ => return Err("未知窗口操作".into()),
            }
            .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "game.spawn" => engine.games.start(input, wire.clone(), &engine.job),
        "game.stop" => {
            engine
                .games
                .stop(input["key"].as_str().ok_or("缺少会话编号")?)?;
            Ok(Value::Null)
        }
        _ => Err("未知本机操作".into()),
    }
}
fn skin_head(texture: &image::DynamicImage) -> Result<image::DynamicImage, String> {
    let (width, height) = (texture.width(), texture.height());
    if width < 64 || width % 64 != 0 || !(height == width || height == width / 2) {
        return Err("皮肤尺寸不符合角色贴图格式".into());
    }
    let unit = width / 64;
    let mut face = texture.crop_imm(8 * unit, 8 * unit, 8 * unit, 8 * unit).to_rgba8();
    let hat = texture.crop_imm(40 * unit, 8 * unit, 8 * unit, 8 * unit).to_rgba8();
    // Some legacy 64x32 skins use the entire unused hat layer as an opaque background.
    if height == width || hat.pixels().any(|p| p[3] != 255) {
        image::imageops::overlay(&mut face, &hat, 0, 0);
    }
    Ok(image::DynamicImage::ImageRgba8(face).resize_exact(64, 64, image::imageops::FilterType::Nearest))
}

#[cfg(test)]
mod avatar_tests {
    use super::skin_head;
    use image::{DynamicImage, Rgba, RgbaImage};

    #[test]
    fn face_and_hat_preserve_pixel_edges_on_standard_and_hd_skins() {
        for unit in [1, 2] {
            let mut skin = RgbaImage::new(64 * unit, 64 * unit);
            for y in 8 * unit..16 * unit {
                for x in 8 * unit..16 * unit {
                    skin.put_pixel(x, y, Rgba([60, 90, 120, 255]));
                }
            }
            for y in 8 * unit..9 * unit {
                for x in 40 * unit..41 * unit {
                    skin.put_pixel(x, y, Rgba([210, 100, 30, 255]));
                }
            }
            let head = skin_head(&DynamicImage::ImageRgba8(skin)).unwrap().to_rgba8();
            assert_eq!(head.dimensions(), (64, 64));
            assert_eq!(head.get_pixel(7, 7).0, [210, 100, 30, 255]);
            assert_eq!(head.get_pixel(8, 8).0, [60, 90, 120, 255]);
        }
        assert!(skin_head(&DynamicImage::new_rgba8(48, 64)).is_err());
    }
}
