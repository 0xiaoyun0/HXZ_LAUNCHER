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
struct Package {
    catalog: Manifest,
    root: PathBuf,
    active: bool,
}
pub struct Extension {
    packages: HashMap<String, Package>,
    bypass: bool,
}
impl Package {
    fn selection(root: &Path) -> String {
        fs::read(root.join("enabled.json"))
            .ok()
            .and_then(|data| serde_json::from_slice::<Value>(&data).ok())
            .and_then(|v| v["sha256"].as_str().map(String::from))
            .unwrap_or_default()
    }
    fn installed(&self, selected: &str) -> bool {
        selected == self.catalog.sha256
            && Self::asset(&self.root, &self.catalog, &self.catalog.entry).is_some()
    }
    fn asset(root: &Path, catalog: &Manifest, key: &str) -> Option<Vec<u8>> {
        let digest = catalog.files.get(key)?;
        let bytes = fs::read(root.join(&catalog.sha256).join(key)).ok()?;
        (format!("{:x}", Sha256::digest(&bytes)) == *digest).then_some(bytes)
    }
}
impl Extension {
    pub fn open(home: &Path) -> Self {
        let catalog: HashMap<String, Manifest> = serde_json::from_str(include_str!(concat!(
            env!("OUT_DIR"),
            "/official-extensions.json"
        )))
        .unwrap_or_default();
        let bypass = std::env::args_os().any(|arg| arg == "--disable-plugins");
        let mut packages = HashMap::new();
        for (id, c) in catalog {
            let root = home.join("extensions").join(&id);
            let selected = Package::selection(&root);
            let active =
                !bypass && selected == c.sha256 && Package::asset(&root, &c, &c.entry).is_some();
            if selected.is_empty()
                && fs::read(root.join("enabled.json"))
                    .ok()
                    .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
                    .is_some_and(|v| v["remove"] == true)
            {
                if let Ok(entries) = fs::read_dir(&root) {
                    for item in entries.flatten() {
                        let name = item.file_name();
                        let hash = name.to_string_lossy();
                        if hash.len() == 64
                            && hash.bytes().all(|b| b.is_ascii_hexdigit())
                            && item.file_type().is_ok_and(|t| t.is_dir())
                        {
                            let _ = fs::remove_dir_all(item.path());
                        }
                    }
                }
            }
            packages.insert(
                id,
                Package {
                    catalog: c,
                    root,
                    active,
                },
            );
        }
        Self { packages, bypass }
    }
    pub fn enabled(&self, id: &str) -> bool {
        self.packages.get(id).is_some_and(|p| p.active)
    }
    pub fn active(&self) -> bool {
        self.enabled("community")
    }
    pub fn pending(&self) -> bool {
        !self.bypass
            && self
                .packages
                .values()
                .any(|p| p.active != p.installed(&Package::selection(&p.root)))
    }
    pub fn status(&self) -> Value {
        let mut modules = serde_json::Map::new();
        for (id, p) in &self.packages {
            let selected = Package::selection(&p.root);
            let c = &p.catalog;
            let installed = p.installed(&selected);
            modules.insert(id.clone(),json!({"available":true,"active":p.active,"safeMode":self.bypass,"installed":installed,"entry":c.entry,"css":c.css,"version":c.version,"size":c.size,"incompatible":!selected.is_empty()&&!installed}));
        }
        let mut status = modules
            .get("community")
            .cloned()
            .unwrap_or(json!({"available":false,"active":false,"installed":false}));
        status["modules"] = Value::Object(modules);
        status
    }
    pub fn respond(&self, req: Request<Vec<u8>>, response: &mut Response<Cow<'static, [u8]>>) {
        let decoded = percent_encoding::percent_decode_str(req.uri().path()).decode_utf8_lossy();
        let key = decoded.trim_start_matches('/');
        if !self
            .packages
            .values()
            .any(|p| p.catalog.files.contains_key(key))
        {
            return;
        }
        let bytes = if req.method() == http::Method::GET {
            self.packages
                .values()
                .filter(|p| p.active)
                .find_map(|p| Package::asset(&p.root, &p.catalog, key))
        } else {
            None
        };
        *response = match bytes {
            Some(bytes) => Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime(key))
                .header("Cache-Control", "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(Cow::Owned(bytes))
                .unwrap(),
            None => Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header("Cache-Control", "no-store")
                .body(Cow::Borrowed(&[][..]))
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
