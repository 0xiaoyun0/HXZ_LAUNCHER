use crate::{
    host,
    library::Library,
    processes::{Games, Job},
};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Write},
    os::windows::process::CommandExt,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
};
use tauri::{AppHandle, Emitter, Manager};

type Reply = Result<Value, String>;
pub struct Wire {
    stdin: Mutex<Box<dyn Write + Send>>,
    pending: Mutex<HashMap<u64, mpsc::Sender<Reply>>>,
    closed: AtomicBool,
}
impl Wire {
    pub fn send(&self, value: &Value) -> Result<(), String> {
        let mut out = self.stdin.lock().unwrap();
        serde_json::to_writer(&mut *out, value).map_err(|e| e.to_string())?;
        out.write_all(b"\n")
            .and_then(|_| out.flush())
            .map_err(|e| e.to_string())
    }
    fn close(&self) {
        self.closed.store(true, Ordering::Release);
        for (_, listener) in self.pending.lock().unwrap().drain() {
            let _ = listener.send(Err("游戏服务已关闭，可以重试当前操作".into()));
        }
    }
}
struct Connection {
    wire: Arc<Wire>,
    child: Child,
}
impl Drop for Connection {
    fn drop(&mut self) {
        self.wire.close();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}
pub struct Engine {
    connection: Mutex<Option<Connection>>,
    seq: AtomicU64,
    pub library: Mutex<Library>,
    pub games: Games,
    pub job: Job,
    pub busy: AtomicBool,
    pub authenticated: AtomicBool,
    pub home: PathBuf,
    pub bin: PathBuf,
}
impl Engine {
    pub fn new(home: PathBuf, bin: PathBuf) -> Result<Arc<Self>, String> {
        Ok(Arc::new(Self {
            connection: Mutex::new(None),
            seq: AtomicU64::new(1),
            library: Default::default(),
            games: Default::default(),
            job: Job::new()?,
            busy: AtomicBool::new(false),
            authenticated: AtomicBool::new(false),
            home,
            bin,
        }))
    }
    pub fn shutdown(&self) {
        if let Some(mut connected) = self.connection.lock().unwrap().take() {
            let _ = connected.wire.send(&json!({"kind":"shutdown"}));
            let until = std::time::Instant::now() + std::time::Duration::from_secs(3);
            while std::time::Instant::now() < until {
                if !matches!(connected.child.try_wait(), Ok(None)) {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(25));
            }
        }
    }
    fn connect(self: &Arc<Self>, app: &AppHandle) -> Result<Arc<Wire>, String> {
        let mut slot = self.connection.lock().unwrap();
        if let Some(c) = slot.as_ref() {
            if !c.wire.closed.load(Ordering::Acquire) {
                return Ok(c.wire.clone());
            }
        }
        slot.take();
        let mut child = Command::new(self.bin.join("node.exe"))
            .arg("--disable-warning=ExperimentalWarning")
            .arg(self.bin.join("engine.cjs"))
            .env("HXZ3_PROFILE", &self.home)
            .env("HXZ3_RESOURCES", self.bin.join("resources"))
            .env_remove("NODE_OPTIONS")
            .env_remove("NODE_PATH")
            .current_dir(&self.bin)
            .creation_flags(0x08000000)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| {
                format!("启动游戏服务失败。请将可执行文件与 engine 文件夹放在一起 ({e})")
            })?;
        if let Err(e) = self.job.attach(&child) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(e);
        }
        let reader = BufReader::new(child.stdout.take().unwrap());
        let wire = Arc::new(Wire {
            stdin: Mutex::new(Box::new(child.stdin.take().unwrap())),
            pending: Default::default(),
            closed: AtomicBool::new(false),
        });
        *slot = Some(Connection {
            wire: wire.clone(),
            child,
        });
        let owner = Arc::downgrade(self);
        let transport = wire.clone();
        let app = app.clone();
        thread::spawn(move || {
            for line in reader.lines().map_while(Result::ok) {
                let Ok(frame) = serde_json::from_str::<Value>(&line) else {
                    continue;
                };
                let id = frame["id"].as_u64().unwrap_or(0);
                match frame["kind"].as_str() {
                    Some("response") => {
                        if let Some(listener) = transport.pending.lock().unwrap().remove(&id) {
                            let reply = if let Some(err) = frame["error"].as_str() {
                                Err(err.into())
                            } else {
                                Ok(frame["value"].clone())
                            };
                            let _ = listener.send(reply);
                        }
                    }
                    Some("event") => {
                        let ev = &frame["value"];
                        if ev["type"] == "game-window" {
                            if let Some(action) = ev["action"].as_str() {
                                app.state::<crate::game_window::GameWindow>()
                                    .follow(&app, action);
                            }
                            continue;
                        }
                        if ev["type"] == "identity-changed" {
                            if let Some(engine) = owner.upgrade() {
                                engine
                                    .authenticated
                                    .store(ev["authenticated"] == true, Ordering::Release);
                            }
                            continue;
                        }
                        if ev["type"] == "task" {
                            if let (Some(busy), Some(engine)) =
                                (ev["busy"].as_bool(), owner.upgrade())
                            {
                                engine.busy.store(busy, Ordering::Release);
                            }
                        }
                        let _ = app.emit_to("main", "engine-event", ev);
                    }
                    Some("host") => {
                        let Some(engine) = owner.upgrade() else { break };
                        let transport = transport.clone();
                        let app = app.clone();
                        thread::spawn(move || {
                            let result = host::dispatch(
                                &app,
                                &engine,
                                &transport,
                                frame["action"].as_str().unwrap_or(""),
                                &frame["input"],
                            );
                            let reply = match result {
                                Ok(v) => json!({"kind":"hostReply","id":id,"value":v}),
                                Err(e) => json!({"kind":"hostReply","id":id,"error":e}),
                            };
                            let _ = transport.send(&reply);
                        });
                    }
                    _ => {}
                }
            }
            if let Some(engine) = owner.upgrade() {
                let slot = engine.connection.lock().unwrap();
                if slot
                    .as_ref()
                    .is_some_and(|c| Arc::ptr_eq(&transport, &c.wire))
                {
                    engine.busy.store(false, Ordering::Release);
                    engine.authenticated.store(false, Ordering::Release);
                }
            }
            transport.close();
        });
        Ok(wire)
    }
    pub fn request(self: &Arc<Self>, app: &AppHandle, action: String, input: Value) -> Reply {
        let wire = self.connect(app)?;
        let id = self.seq.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = mpsc::channel();
        {
            let mut pending = wire.pending.lock().unwrap();
            if wire.closed.load(Ordering::Acquire) {
                return Err("游戏服务正在重启".into());
            }
            pending.insert(id, sender);
        }
        if let Err(e) = wire.send(&json!({"kind":"request","id":id,"action":action,"input":input}))
        {
            wire.pending.lock().unwrap().remove(&id);
            return Err(e);
        }
        receiver.recv().map_err(|_| "游戏服务已断开".to_string())?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    #[derive(Clone, Default)]
    struct Output(Arc<Mutex<Vec<u8>>>);
    impl Write for Output {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            self.0.lock().unwrap().extend_from_slice(buf);
            Ok(buf.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }
    impl Output {
        fn frames(&self) -> Vec<Value> {
            self.0
                .lock()
                .unwrap()
                .split(|b| *b == 10)
                .filter_map(|line| serde_json::from_slice(line).ok())
                .collect()
        }
        fn wait_for(&self, key: &str, kind: &str) -> Value {
            let deadline = Instant::now() + Duration::from_secs(30);
            loop {
                if let Some(v) = self
                    .frames()
                    .into_iter()
                    .find(|v| v["key"] == key && v["type"] == kind)
                {
                    return v;
                }
                assert!(Instant::now() < deadline, "missing {kind} for {key}");
                thread::sleep(Duration::from_millis(40));
            }
        }
    }
    #[test]
    fn two_native_java_processes_are_stopped_independently_and_stream_output() {
        let java = std::env::var_os("JAVA_HOME")
            .map(PathBuf::from)
            .map(|p| p.join("bin/java.exe"))
            .filter(|p| p.is_file())
            .or_else(|| {
                let out = Command::new("where.exe").arg("java.exe").output().ok()?;
                String::from_utf8_lossy(&out.stdout)
                    .lines()
                    .map(PathBuf::from)
                    .find(|p| p.is_file())
            })
            .expect("Install a JDK on PATH or set JAVA_HOME");
        let root = tempfile::tempdir().unwrap();
        let file = root.path().join("Session.java");
        std::fs::write(&file,r#"class Session { public static void main(String[] args) throws Exception { System.out.println("ready"); Thread.sleep(Long.parseLong(args[0])); System.err.println("finished"); } }"#).unwrap();
        let output = Output::default();
        let wire = Arc::new(Wire {
            stdin: Mutex::new(Box::new(output.clone())),
            pending: Default::default(),
            closed: AtomicBool::new(false),
        });
        let games = Games::default();
        let job = Job::new().unwrap();
        let launch = |key: &str, delay: &str| {
            games
                .start(
                    &json!({"key":key,"command":java,"args":[file,delay],"cwd":root.path()}),
                    wire.clone(),
                    &job,
                )
                .unwrap()
        };
        let a = launch("one", "20000");
        let b = launch("two", "2200");
        assert_ne!(a["pid"], b["pid"]);
        output.wait_for("one", "stdout");
        games.stop("one").unwrap();
        assert_ne!(output.wait_for("one", "exit")["code"], 0);
        output.wait_for("two", "stderr");
        assert_eq!(output.wait_for("two", "exit")["code"], 0);
        assert!(!games.active());
    }
}
