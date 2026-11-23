use serde_json::{json, Value};
use std::{path::PathBuf, sync::Mutex};

#[derive(Default)]
pub struct Dropped(Mutex<(u64, Vec<PathBuf>)>);

impl Dropped {
    pub fn remember(&self, paths: &[PathBuf]) -> u64 {
        let mut last = self.0.lock().unwrap();
        last.0 = last.0.wrapping_add(1);
        last.1 = paths.to_vec();
        last.0
    }

    pub fn consume(&self, input: &Value) -> Result<(String, Value), String> {
        let mut last = self.0.lock().unwrap();
        if Some(last.0) != input["ticket"].as_u64() || last.1.is_empty() {
            return Err("这次拖放已经结束，请重新拖入文件".into());
        }
        let files = std::mem::take(&mut last.1);
        if input["target"] == "instance" {
            return Ok(("instance.files.import".into(), json!({"files":files,"id":input["id"],"kind":input["kind"]})));
        }
        if input["target"] == "pack" && files.len() == 1 && files[0].extension().and_then(|v| v.to_str())
            .is_some_and(|v| v.eq_ignore_ascii_case("zip") || v.eq_ignore_ascii_case("mrpack")) {
            return Ok(("pack.inspect".into(), json!({"file":files[0]})));
        }
        Err("请拖入一个整合包，或把模组、资源包、光影和蓝图拖到对应实例的文件区".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn drop_target_selects_importer_and_stale_drops_do_not_consume_later_files() {
        let drops=Dropped::default();
        let old=drops.remember(&["first.jar".into()]);
        let ticket=drops.remember(&["textures.zip".into(),"second.zip".into()]);
        assert!(drops.consume(&json!({"ticket":old,"target":"pack"})).is_err());
        let (action,files)=drops.consume(&json!({"ticket":ticket,"target":"instance","kind":"resources","id":"demo"})).unwrap();
        assert_eq!(action,"instance.files.import");
        assert_eq!(files["files"].as_array().unwrap().len(),2);
        assert!(drops.consume(&json!({"ticket":ticket,"target":"pack"})).is_err());
        let pack=drops.remember(&["demo.MRPACK".into()]);
        assert_eq!(drops.consume(&json!({"ticket":pack,"target":"pack"})).unwrap().0,"pack.inspect");
    }
}
