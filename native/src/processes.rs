use crate::worker::Wire;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::Read,
    os::windows::{io::AsRawHandle, process::CommandExt},
    path::Path,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE},
    System::JobObjects::*,
};

pub struct Job(HANDLE);
// A job handle is process-wide and is closed only after all owners release this object.
unsafe impl Send for Job {}
unsafe impl Sync for Job {}
impl Job {
    pub fn new() -> Result<Self, String> {
        unsafe {
            let h = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if h.is_null() {
                return Err(std::io::Error::last_os_error().to_string());
            }
            let job = Self(h);
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if SetInformationJobObject(
                h,
                JobObjectExtendedLimitInformation,
                &info as *const _ as _,
                std::mem::size_of_val(&info) as u32,
            ) == 0
            {
                return Err(std::io::Error::last_os_error().to_string());
            }
            Ok(job)
        }
    }
    pub fn attach(&self, child: &Child) -> Result<(), String> {
        if unsafe { AssignProcessToJobObject(self.0, child.as_raw_handle() as _) } == 0 {
            Err(std::io::Error::last_os_error().to_string())
        } else {
            Ok(())
        }
    }
}
impl Drop for Job {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}

type Children = Arc<Mutex<HashMap<String, Arc<Mutex<Child>>>>>;
#[derive(Default)]
pub struct Games {
    children: Children,
}
impl Games {
    pub fn stop(&self, key: &str) -> Result<(), String> {
        if let Some(child) = self.children.lock().unwrap().get(key) {
            child.lock().unwrap().kill().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    pub fn active(&self) -> bool {
        !self.children.lock().unwrap().is_empty()
    }
    pub fn start(&self, input: &Value, wire: Arc<Wire>, job: &Job) -> Result<Value, String> {
        let key = input["key"].as_str().ok_or("缺少会话编号")?.to_owned();
        let exe = Path::new(input["command"].as_str().ok_or("缺少 Java")?);
        if !exe.is_absolute()
            || !matches!(
                exe.file_name()
                    .and_then(|f| f.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase()
                    .as_str(),
                "java.exe" | "javaw.exe"
            )
        {
            return Err("请选择本机 Java 可执行文件".into());
        }
        let arguments: Vec<&str> = input["args"]
            .as_array()
            .ok_or("缺少游戏参数")?
            .iter()
            .map(|v| v.as_str().ok_or("无效游戏参数"))
            .collect::<Result<_, _>>()?;
        let mut children = self.children.lock().unwrap();
        if children.contains_key(&key) {
            return Err("游戏会话已存在".into());
        }
        let mut child = Command::new(exe)
            .args(arguments)
            .current_dir(input["cwd"].as_str().ok_or("缺少实例目录")?)
            .creation_flags(0x08000000)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        if let Err(e) = job.attach(&child) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(e);
        }
        let pid = child.id();
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        let handle = Arc::new(Mutex::new(child));
        children.insert(key.clone(), handle.clone());
        drop(children);
        wire.send(&json!({"kind":"process","key":key,"type":"spawn","pid":pid}))?;
        let send_output = |mut stream: Box<dyn Read + Send>, channel: &'static str| {
            let wire = wire.clone();
            let key = key.clone();
            thread::spawn(move || {
                let mut buf = [0u8; 8192];
                while let Ok(n) = stream.read(&mut buf) {
                    if n == 0 {
                        break;
                    }
                    if wire.send(&json!({"kind":"process","key":key,"type":channel,"bytes":STANDARD.encode(&buf[..n])})).is_err(){break;}
                }
            })
        };
        let out = send_output(Box::new(stdout), "stdout");
        let err = send_output(Box::new(stderr), "stderr");
        let children = self.children.clone();
        thread::spawn(move || {
            let code = loop {
                let result = handle.lock().unwrap().try_wait();
                match result {
                    Ok(Some(s)) => break s.code(),
                    Err(_) => break None,
                    _ => thread::sleep(Duration::from_millis(80)),
                }
            };
            let _ = out.join();
            let _ = err.join();
            children.lock().unwrap().remove(&key);
            let _ = wire.send(&json!({"kind":"process","key":key,"type":"exit","code":code}));
        });
        Ok(json!({"pid":pid}))
    }
}
