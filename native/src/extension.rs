use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    borrow::Cow,
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};
use tauri::http::{self, Request, Response, StatusCode};

#[derive(Deserialize)]
struct Manifest {
    sha256: String,
    version: String,
    entry: String,
    css: Vec<String>,
    size: usize,
    files: HashMap<String, String>,
}
pub struct Extension {
    catalog: Option<Manifest>,
    root: PathBuf,
    active: bool,
    bypass: bool,
}
impl Extension {
    pub fn open(home: &Path) -> Self {
        let root = home.join("extensions").join("community");
        let catalog: Option<Manifest> = serde_json::from_str(include_str!(concat!(
            env!("OUT_DIR"),
            "/community-extension.json"
        )))
        .ok();
        let bypass = std::env::args_os().any(|arg| arg == "--disable-plugins");
        let active = !bypass && catalog.as_ref().is_some_and(|c| {
            Self::selection(&root) == c.sha256 && Self::asset(&root, c, &c.entry).is_some()
        });
        Self {
            catalog,
            root,
            active,
            bypass,
        }
    }
    fn selection(root: &Path) -> String {
        fs::read(root.join("enabled.json"))
            .ok()
            .and_then(|data| serde_json::from_slice::<Value>(&data).ok())
            .and_then(|v| v["sha256"].as_str().map(String::from))
            .unwrap_or_default()
    }
    fn asset(root: &Path, catalog: &Manifest, key: &str) -> Option<Vec<u8>> {
        let digest = catalog.files.get(key)?;
        let bytes = fs::read(root.join(&catalog.sha256).join(key)).ok()?;
        (format!("{:x}", Sha256::digest(&bytes)) == *digest).then_some(bytes)
    }
    pub fn active(&self) -> bool {
        self.active
    }
    pub fn status(&self) -> Value {
        let Some(c) = &self.catalog else {
            return json!({"available":false,"active":false,"installed":false});
        };
        let selected = Self::selection(&self.root);
        json!({"available":true,"active":self.active,"safeMode":self.bypass,"installed":selected==c.sha256,"entry":c.entry,"css":c.css,"version":c.version,"size":c.size,
            "incompatible":!selected.is_empty()&&selected!=c.sha256})
    }
    pub fn respond(&self, req: Request<Vec<u8>>, response: &mut Response<Cow<'static, [u8]>>) {
        let Some(c) = &self.catalog else {
            return;
        };
        let decoded = percent_encoding::percent_decode_str(req.uri().path()).decode_utf8_lossy();
        let key = decoded.trim_start_matches('/');
        if !c.files.contains_key(key) {
            return;
        }
        *response = match (self.active && req.method() == http::Method::GET)
            .then(|| Self::asset(&self.root, c, key))
            .flatten()
        {
            Some(data) => Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime(key))
                .header("Cache-Control", "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(Cow::Owned(data))
                .unwrap(),
            None => Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header("Cache-Control", "no-store")
                .body(Cow::Owned(Vec::new()))
                .unwrap(),
        };
    }
}
fn mime(key: &str) -> &'static str {
    match key.rsplit('.').next().unwrap_or("") {
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "html" => "text/html; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "webp" => "image/webp",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "json" => "application/json",
        "mp3" => "audio/mpeg",
        "ogg" => "audio/ogg",
        "wav" => "audio/wav",
        "wasm" => "application/wasm",
        _ => "application/octet-stream",
    }
}
