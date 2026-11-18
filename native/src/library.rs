use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    time::SystemTime,
};

#[derive(Clone)]
struct Metadata {
    stamp: (u64, Option<SystemTime>),
    value: Result<Value, String>,
}

#[derive(Default)]
pub struct Library {
    root: PathBuf,
    files: HashMap<String, Metadata>,
}

fn component(id: &str) -> bool {
    !id.is_empty() && id != "." && id != ".." && !id.contains(['/', '\\', ':'])
}

impl Library {
    fn metadata(&mut self, versions: &Path, id: &str) -> Result<Value, String> {
        if !component(id) {
            return Err("实例的父版本名称无效".into());
        }
        let path = versions.join(id).join(format!("{id}.json"));
        let info = fs::symlink_metadata(&path)
            .map_err(|e| format!("版本文件 {id}.json 无法读取 ({e})"))?;
        if !info.is_file() || info.len() > 32 * 1024 * 1024 {
            return Err("版本文件格式或大小无效".into());
        }
        let stamp = (info.len(), info.modified().ok());
        if let Some(hit) = self.files.get(id).filter(|entry| entry.stamp == stamp) {
            return hit.value.clone();
        }
        let value = fs::read(&path).map_err(|e|e.to_string()).and_then(|bytes| {
            let src: Value = serde_json::from_slice(&bytes).map_err(|e|format!("版本文件 {id}.json 格式错误 ({e})"))?;
            if !src.is_object() { return Err("版本说明须为 JSON 对象".into()); }
            Ok(json!({"id":src["id"],"parent":src["inheritsFrom"],"java":src["javaVersion"]["majorVersion"],"patches":src["patches"],"main":src["mainClass"]}))
        });
        self.files.insert(
            id.to_owned(),
            Metadata {
                stamp,
                value: value.clone(),
            },
        );
        value
    }

    fn instance(&mut self, versions: &Path, id: &str) -> Result<Value, String> {
        if versions
            .join(id)
            .join(".hxzl/install-request.json")
            .is_file()
        {
            return Err("安装未完成，可在资源工坊恢复任务".into());
        }
        let mut ancestry = HashSet::new();
        let mut current = id.to_owned();
        let mut resolved = json!({});
        loop {
            if !ancestry.insert(current.clone()) || ancestry.len() > 16 {
                return Err("游戏版本的继承链存在循环或超过 16 层".into());
            }
            let data = self.metadata(versions, &current)?;
            for key in ["id", "parent", "java", "patches", "main"] {
                if resolved[key].is_null() && !data[key].is_null() {
                    resolved[key] = data[key].clone();
                }
            }
            match data["parent"].as_str() {
                Some(p) if !p.is_empty() => current = p.to_owned(),
                _ => break,
            }
        }
        let patches = resolved["patches"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or_default();
        let version = patches
            .iter()
            .find(|p| p["id"] == "game")
            .and_then(|p| p["version"].as_str())
            .unwrap_or(&current);
        let main = resolved["main"].as_str().unwrap_or_default().to_lowercase();
        let loader = patches
            .iter()
            .find(|p| p["id"].as_str().is_some_and(|name| name != "game"))
            .map(|p| {
                format!(
                    "{} {}",
                    p["id"].as_str().unwrap_or(""),
                    p["version"].as_str().unwrap_or("")
                )
                .trim()
                .to_string()
            })
            .unwrap_or_else(|| {
                if main.contains("fabric") {
                    "Fabric"
                } else if main.contains("quilt") {
                    "Quilt"
                } else if main.contains("neoforg") {
                    "NeoForge"
                } else if main.contains("bootstrap") || main.contains("forge") {
                    "Forge / NeoForge"
                } else {
                    "原版"
                }
                .into()
            });
        Ok(
            json!({"id":id,"name":id,"installed":true,"version":version,"loader":loader,"javaMajor":resolved["java"]}),
        )
    }

    pub fn scan(&mut self, root: &str) -> Result<Value, String> {
        if root.is_empty() {
            return Ok(json!([]));
        }
        let versions = Path::new(root).join("versions");
        if self.root != versions {
            self.files.clear();
            self.root = versions.clone();
        }
        let entries = match fs::read_dir(&versions) {
            Ok(v) => v,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(json!([])),
            Err(e) => return Err(e.to_string()),
        };
        let mut ids = Vec::new();
        for entry in entries {
            let e = entry.map_err(|e| e.to_string())?;
            if e.file_type().map_err(|e| e.to_string())?.is_dir() {
                if let Ok(id) = e.file_name().into_string() {
                    ids.push(id);
                }
            }
        }
        ids.sort();
        self.files.retain(|id, _| ids.binary_search(id).is_ok());
        Ok(Value::Array(
            ids.iter()
                .map(|id| {
                    self.instance(&versions, id).unwrap_or_else(
                        |err| json!({"id":id,"name":id,"installed":false,"error":err}),
                    )
                })
                .collect(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn instance(root: &Path, id: &str, contents: &str) {
        let dir = root.join("versions").join(id);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(format!("{id}.json")), contents).unwrap();
    }
    #[test]
    fn inheritance_cache_keeps_bad_rows_and_updates_parents() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        instance(
            root,
            "base",
            r#"{"id":"base","javaVersion":{"majorVersion":17}}"#,
        );
        instance(
            root,
            "child",
            r#"{"id":"child","inheritsFrom":"base","mainClass":"fabric.launch"}"#,
        );
        instance(root, "broken", "{");
        instance(root, "cycle", r#"{"id":"cycle","inheritsFrom":"cycle"}"#);
        let mut index = Library::default();
        let scan = index.scan(root.to_str().unwrap()).unwrap();
        assert_eq!(scan[1]["installed"], false);
        assert_eq!(scan[2]["javaMajor"], 17);
        assert_eq!(scan[2]["loader"], "Fabric");
        assert_eq!(scan[3]["installed"], false);
        instance(
            root,
            "base",
            r#"{"id":"base","javaVersion":{"majorVersion":21},"new":true}"#,
        );
        assert_eq!(
            index.scan(root.to_str().unwrap()).unwrap()[2]["javaMajor"],
            21
        );
    }
    #[test]
    fn every_instance_remains_visible() {
        let dir = tempfile::tempdir().unwrap();
        for n in 0..315 {
            let id = format!("v{n}");
            instance(dir.path(), &id, &format!(r#"{{"id":"{id}"}}"#));
        }
        assert_eq!(
            Library::default()
                .scan(dir.path().to_str().unwrap())
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            315
        );
    }
}
